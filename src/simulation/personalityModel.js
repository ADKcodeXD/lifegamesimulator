import {
  MBTI_LABELS,
  PERSONALITY_ADAPTATIONS,
  PERSONALITY_LIMITS,
} from "../data/personalityConfig.ts";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function deriveMbti(settings = {}) {
  const text = `${settings.bio?.personality || ""} ${settings.bio?.hobbies || ""}`;
  const introverted = /内敛|安静|独处|慢热|社交不算广泛|幕后/.test(text);
  const extroverted = /外向|热情|健谈|社交广泛|喜欢结识/.test(text);
  const feeling = /细腻|共情|温柔|感性|重感情|体贴/.test(text);
  const traits = settings.traits || {};
  const ei = introverted && !extroverted ? "I" : "E";
  const sn = Number(traits.好奇 || 50) >= 58 ? "N" : "S";
  const tf = feeling ? "F" : Number(traits.理性 || 50) >= 58 ? "T" : "F";
  const jp = Number(traits.冒险 || 50) >= 55 ? "P" : "J";
  return `${ei}${sn}${tf}${jp}`;
}

export function createInitialPersonalityProfile(settings = {}) {
  const mbti = deriveMbti(settings);
  const age = Number(settings.startAge ?? 18);
  const coreSummary =
    settings.bio?.personality || "性格仍在成长，将由后续经历逐步塑造。";
  return {
    mbti,
    mbtiLabel: MBTI_LABELS[mbti] || "持续成长",
    mbtiBasis:
      "根据初始性格描述与理性、冒险、好奇等倾向生成，仅作为起点而非定论。",
    coreSummary,
    currentSummary: coreSummary,
    adaptations: [],
    history: [
      {
        id: "personality-baseline",
        age,
        kind: "baseline",
        title: `初始人格锚点 · ${mbti}`,
        detail: coreSummary,
      },
    ],
    lastUpdatedAge: age,
  };
}

export function normalizePersonalityProfile(profile, settings = {}) {
  const baseline = createInitialPersonalityProfile(settings);
  if (!profile) return baseline;
  return {
    ...baseline,
    ...profile,
    adaptations: Array.isArray(profile.adaptations)
      ? profile.adaptations
          .filter(Boolean)
          .slice(-PERSONALITY_LIMITS.adaptations)
      : [],
    history: Array.isArray(profile.history)
      ? profile.history.filter(Boolean).slice(-PERSONALITY_LIMITS.history)
      : baseline.history,
  };
}

function soften(text, fallback) {
  return String(text || fallback || "")
    .replace(/永远不/g, "暂时不太")
    .replace(/绝不/g, "更少")
    .replace(/完全不相信/g, "更难轻易相信")
    .replace(/不再相信/g, "更难轻易相信")
    .replace(/再也不/g, "暂时不愿轻易");
}

function fallbackUpdate(result, context) {
  const text = `${result.title || ""} ${result.event || ""} ${result.log || ""} ${result.summary || ""}`;
  const changes = context.relationshipChanges || [];
  const romantic =
    /恋人|女友|男友|伴侣|配偶|妻子|丈夫|暧昧/.test(text) ||
    changes.some((item) =>
      /恋人|女友|男友|伴侣|配偶|妻子|丈夫|暧昧|分手/.test(
        `${item.status || ""}${item.action || ""}`,
      ),
    );
  const family = changes.some(
    (item) =>
      /父亲|母亲|父母|家人/.test(item.name || "") && Number(item.delta) <= -12,
  );
  const severeSocial = changes.some((item) => Number(item.delta) <= -18);
  const repaired = /和解|复合|重归于好|冰释前嫌|修复关系/.test(text);
  if (/出轨|背叛|劈腿|欺骗感情/.test(text) && romantic)
    return { key: "romanticCaution", intensity: 3, trigger: result.title };
  if (family)
    return { key: "familyDefense", intensity: 2, trigger: result.title };
  if (severeSocial)
    return { key: "socialCaution", intensity: 2, trigger: result.title };
  if (repaired)
    return { key: "trustRecovery", intensity: 1, trigger: result.title };
  return null;
}

export function applyPersonalityTurn(profile, result = {}, context = {}) {
  const current = normalizePersonalityProfile(profile, context.settings);
  const supplied = result.personalityUpdate?.changed
    ? {
        key: result.personalityUpdate.key,
        dimension: result.personalityUpdate.dimension,
        title: result.personalityUpdate.title,
        tendency: result.personalityUpdate.tendency,
        intensity: result.personalityUpdate.intensity,
        trigger: result.personalityUpdate.trigger,
        summary: result.personalityUpdate.summary,
      }
    : null;
  const update = supplied || fallbackUpdate(result, context);
  if (!update) return current;

  const template = PERSONALITY_ADAPTATIONS[update.key] || {};
  const dimension = update.dimension || template.dimension || "social";
  const title = update.title || template.title || "性格适应变化";
  const tendency = soften(update.tendency, template.tendency);
  const intensity = clamp(Number(update.intensity) || 1, 1, 3);
  const existingIndex = current.adaptations.findIndex(
    (item) => item.key === update.key || item.dimension === dimension,
  );
  const adaptations = [...current.adaptations];
  const isRecovery = update.key === "trustRecovery";
  const previousIntensity = adaptations[existingIndex]?.intensity || 0;
  const adaptation = {
    ...(existingIndex >= 0 ? adaptations[existingIndex] : {}),
    key: update.key || dimension,
    dimension,
    title,
    tendency,
    intensity: isRecovery
      ? clamp(previousIntensity - 1 || 1, 1, 3)
      : clamp(Math.max(intensity, previousIntensity), 1, 3),
    formedAtAge: adaptations[existingIndex]?.formedAtAge ?? context.age,
    lastUpdatedAge: context.age,
    evidence: [
      ...(adaptations[existingIndex]?.evidence || []),
      update.trigger || result.title || "重要人生经历",
    ].slice(-4),
  };
  if (existingIndex >= 0) adaptations[existingIndex] = adaptation;
  else adaptations.push(adaptation);

  const summary = soften(
    update.summary,
    `${current.coreSummary} 经历“${update.trigger || result.title || "重要事件"}”后，${tendency}`,
  );
  return {
    ...current,
    currentSummary: summary,
    adaptations: adaptations.slice(-PERSONALITY_LIMITS.adaptations),
    history: [
      ...current.history,
      {
        id: `personality-${context.age}-${Date.now()}`,
        age: context.age,
        kind: "adaptation",
        title,
        detail: tendency,
        trigger: update.trigger || result.title || "重要人生经历",
        intensity: adaptation.intensity,
      },
    ].slice(-PERSONALITY_LIMITS.history),
    lastUpdatedAge: context.age,
  };
}
