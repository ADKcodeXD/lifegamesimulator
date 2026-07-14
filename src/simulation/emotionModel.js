const clamp = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

export function normalizeEmotion(state = {}, fallback = 72) {
  return clamp(state.emotion ?? state.mood ?? fallback);
}

export function describeEmotion(value) {
  const emotion = clamp(value);
  if (emotion >= 85) {
    return {
      value: emotion,
      label: "高涨",
      actionMultiplier: 1.18,
      actionDrive: 100,
      selfHarmRisk: "无明显风险",
      crisisLevel: "none",
      guidance: "精力和主动性较强，但仍可能高估自己的承受能力。",
    };
  }
  if (emotion >= 65) {
    return {
      value: emotion,
      label: "稳定",
      actionMultiplier: 1,
      actionDrive: emotion,
      selfHarmRisk: "无明显风险",
      crisisLevel: "none",
      guidance: "能够维持日常行动、社交和长期计划。",
    };
  }
  if (emotion >= 45) {
    return {
      value: emotion,
      label: "波动",
      actionMultiplier: 0.86,
      actionDrive: Math.round(emotion * 0.9),
      selfHarmRisk: "无明显风险",
      crisisLevel: "none",
      guidance: "行动更容易被疲惫、担忧或短期情绪打断。",
    };
  }
  if (emotion >= 25) {
    return {
      value: emotion,
      label: "低落",
      actionMultiplier: 0.64,
      actionDrive: Math.round(emotion * 0.75),
      selfHarmRisk: "需要关注",
      crisisLevel: "watch",
      guidance: "主动性明显下降，更可能拖延、回避、暂停计划或寻求支持。",
    };
  }
  if (emotion >= 10) {
    return {
      value: emotion,
      label: "低迷",
      actionMultiplier: 0.4,
      actionDrive: Math.round(emotion * 0.55),
      selfHarmRisk: "可能出现自伤或自杀念头",
      crisisLevel: "elevated",
      guidance:
        "行动力严重受限，应优先呈现休息、陪伴、求助或专业支持；危机倾向不是必然行动。",
    };
  }
  return {
    value: emotion,
    label: "危机",
    actionMultiplier: 0.22,
    actionDrive: Math.max(2, Math.round(emotion * 0.35)),
    selfHarmRisk: "自伤或自杀风险较高",
    crisisLevel: "critical",
    guidance:
      "人物处于心理危机，应优先触发安全保护、可信任者介入和专业支持，避免把危机浪漫化或写成必然死亡。",
  };
}

export function emotionDeltaFromResult(result = {}) {
  const delta = result.stateDelta || {};
  return Number(delta.emotion ?? delta.mood ?? 0) || 0;
}

export function reconcileEmotionRiskShifts(riskShifts = [], emotionValue) {
  const emotion = describeEmotion(emotionValue);
  const shifts = Array.isArray(riskShifts) ? riskShifts.filter(Boolean) : [];
  const existingIndex = shifts.findIndex((item) =>
    /心理|情绪|自伤|自杀/.test(String(item?.name || "")),
  );
  const existing = existingIndex >= 0 ? shifts[existingIndex] : null;
  const target =
    emotion.crisisLevel === "critical"
      ? 92
      : emotion.crisisLevel === "elevated"
        ? 74
        : emotion.crisisLevel === "watch"
          ? 42
          : Math.max(0, Number(existing?.value || 0) - 18);
  if (!existing && target === 0) return shifts;
  const next = [...shifts];
  const entry = {
    name: "心理危机",
    value: target,
    trend:
      target > Number(existing?.value || 0)
        ? "上升"
        : target < Number(existing?.value || 0)
          ? "下降"
          : "持平",
  };
  if (existingIndex >= 0) next[existingIndex] = entry;
  else next.push(entry);
  return next;
}
