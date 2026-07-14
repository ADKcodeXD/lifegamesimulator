import { MILESTONE_PATTERN } from "../data/simulationTemplates";
import { normalizeEmotion } from "./emotionModel";

export function deriveDomainEvents({
  result,
  previousState,
  nextState,
  financialTurn,
  nextMonth,
  nextAge,
  netWorthBefore,
}) {
  const events = [];
  const text = `${result.title || ""} ${result.tag || ""} ${result.event || ""}`;
  const deltas = [
    { key: "health", label: "健康", value: nextState.health - previousState.health },
    {
      key: "emotion",
      label: "情绪",
      value: normalizeEmotion(nextState) - normalizeEmotion(previousState),
    },
    { key: "career", label: "事业", value: nextState.career - previousState.career },
    { key: "netWorth", label: "净资产", value: Math.round(financialTurn.netWorthChange) },
  ].filter((item) => item.value !== 0);

  events.push({ type: "turn.completed", severity: "info", payload: { title: result.title } });
  for (const delta of deltas) {
    events.push({
      type: `protagonist.${delta.key}.changed`,
      severity:
        (delta.key === "health" && Math.abs(delta.value) >= 20) ||
        (delta.key === "career" && Math.abs(delta.value) >= 25)
          ? "major"
          : "info",
      payload: delta,
    });
  }

  const majorAssets = financialTurn.entries.filter(
    (entry) =>
      ["buy_asset", "sell_asset"].includes(entry.kind) ||
      ["realEstate", "vehicles"].includes(entry.account) ||
      Math.abs(Number(entry.assetDelta) || 0) >=
        Math.max(50000, Math.abs(netWorthBefore) * 0.2),
  );
  for (const entry of majorAssets) {
    events.push({ type: "asset.majorChanged", severity: "major", payload: entry });
  }
  for (const worldEvent of result.worldEvents || []) {
    events.push({
      type: "world.eventUpdated",
      severity: Number(worldEvent.intensity) >= 70 ? "major" : "info",
      payload: worldEvent,
    });
  }
  for (const change of result.relationshipChanges || []) {
    events.push({
      type: "relationship.changed",
      severity: Math.abs(Number(change.delta) || 0) >= 35 ? "major" : "info",
      payload: change,
    });
  }
  if (MILESTONE_PATTERN.test(text)) {
    events.push({
      type: "life.milestoneReached",
      severity: "major",
      payload: { title: result.title, text },
    });
  }
  if (result.death?.occurred) {
    events.push({ type: "life.ended", severity: "terminal", payload: result.death });
  }
  return { events, deltas, majorAssets, nextMonth, nextAge };
}

const bulletinVariant = (result) => {
  const text = `${result.title || ""} ${result.tag || ""} ${result.event || ""}`;
  if (result.death?.occurred) return { variant: "death", label: "生命终结" };
  if (/结婚|婚礼|领证|成婚/.test(text)) return { variant: "marriage", label: "缔结婚姻" };
  if (result.outcomeAudit?.direction === "favorable") return { variant: "success", label: "有利结算" };
  if (result.outcomeAudit?.direction === "adverse") return { variant: "failure", label: "不利结算" };
  return { variant: "effort", label: result.outcomeAudit?.direction === "stagnant" ? "努力未兑现" : "继续积累" };
};

export function buildMajorNotification(result, domain) {
  if (!domain.events.some((event) => ["major", "terminal"].includes(event.severity))) return null;
  const type = bulletinVariant(result);
  return {
    ...type,
    resultLabel: type.label,
    time: `${domain.nextAge}岁 · ${(domain.nextMonth % 12) + 1}月`,
    life: {
      title: result.title,
      summary: result.summary || result.log || result.event,
      deltas: domain.deltas.slice(0, 4),
    },
    world:
      domain.events.find(
        (event) => event.type === "world.eventUpdated" && event.severity === "major",
      )?.payload || null,
    assets: domain.majorAssets,
  };
}
