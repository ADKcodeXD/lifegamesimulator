const clamp = (value, min = 0, max = 100) =>
  Math.max(min, Math.min(max, Number(value) || 0));

const startYearFor = (world = "") => {
  const match = String(world).match(/(?:19|20)\d{2}/);
  return match ? Number(match[0]) : 2026;
};

const regionFor = (world = "") => {
  const firstSentence = String(world).split(/[。；;，,]/)[0].trim();
  return firstSentence.replace(/^(?:19|20)\d{2}\s*年?\s*/, "") || "未命名世界";
};

const normalizeEvent = (event, log, index) => {
  if (!event?.title || !event?.description) return null;
  return {
    id: event.id || `model-world-${log.month ?? "history"}-${index}`,
    scope: event.scope || "当前世界",
    title: event.title,
    phase: event.phase || event.status || "正在发展",
    status: event.status || "ongoing",
    tone: ["danger", "warning", "opportunity", "neutral"].includes(event.tone)
      ? event.tone
      : "neutral",
    intensity: clamp(event.intensity, 0, 100),
    description: event.description,
    effects: event.effects || {},
    generatedByModel: true,
    occurredAt: log.time,
  };
};

export function buildWorldState(settings = {}, month = 0, logs = []) {
  const world = settings.world || "";
  const startYear = startYearFor(world);
  const absoluteMonth = startYear * 12 + Math.max(0, Number(month) || 0);
  const year = Math.floor(absoluteMonth / 12);
  const monthOfYear = (absoluteMonth % 12) + 1;
  const modelLogs = (Array.isArray(logs) ? logs : []).filter(
    (log) => log?.worldChange || log?.worldStateUpdate || log?.worldEvents?.length,
  );
  const latest = modelLogs.at(-1);
  const eventHistory = modelLogs
    .slice(-8)
    .flatMap((log) =>
      (Array.isArray(log.worldEvents) ? log.worldEvents : []).map((event, index) =>
        normalizeEvent(event, log, index),
      ),
    );
  const events = [...new Map(eventHistory.filter(Boolean).map((event) => [event.id, event])).values()]
    .filter((event) => event.status !== "resolved")
    .slice(-5)
    .reverse();
  const update =
    modelLogs
      .slice()
      .reverse()
      .find((log) => log.worldStateUpdate)?.worldStateUpdate || {};
  const indicators = Array.isArray(update.indicators)
    ? update.indicators.slice(0, 4).map((item, index) => ({
        key: item.key || `model-indicator-${index}`,
        label: item.label || "世界变量",
        value: clamp(item.value),
      }))
    : [];
  const activeEffects = events.map((event) => event.effects || {});
  const maxEffect = (key) =>
    Math.max(0, ...activeEffects.map((effects) => clamp(effects[key])));
  const financialRisk = maxEffect("financialRisk");
  const energyPressure = maxEffect("energyPrice");
  const housingPressure = maxEffect("housingPressure");
  const adversePressure = Math.max(
    financialRisk,
    maxEffect("employmentPressure"),
    maxEffect("healthPressure"),
  );
  const opportunity = maxEffect("careerOpportunity");

  return {
    date: { year, month: monthOfYear, label: `${year}年${monthOfYear}月` },
    region: update.region || regionFor(world),
    climate: update.climate || (latest ? "世界持续演化中" : "等待首次世界推演"),
    summary:
      update.summary ||
      latest?.worldChange ||
      (world
        ? `初始世界种子：${world}。具体新闻与社会变化将在每轮由故事引擎现场推演，不使用预设事件。`
        : "尚未提供世界种子；具体世界变化将在每轮由故事引擎现场推演。"),
    indicators,
    events,
    modifiers: {
      financialShock: 1 + financialRisk / 180 + energyPressure / 360,
      adverseWeight: clamp(adversePressure / 700, 0, 0.14),
      opportunityWeight: clamp(opportunity / 900, 0, 0.1),
      housingPressure,
      energyPressure,
    },
    source: latest ? "model-history" : "world-seed",
  };
}
