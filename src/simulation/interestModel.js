const clamp = (value, min = 0, max = 100) =>
  Math.max(min, Math.min(max, Number(value) || 0));

const normalizeLabel = (value) =>
  String(value || "")
    .trim()
    .replace(/^(喜欢|爱好是|爱好包括|平时喜欢)/, "")
    .slice(0, 30);

const hashLabel = (label) => {
  let hash = 2166136261;
  for (const char of label) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

export const interestIdFor = (label) =>
  `interest_${hashLabel(normalizeLabel(label))}`;

export function parseInitialInterests(hobbies = "") {
  return [
    ...new Set(
      String(hobbies)
        .split(/[、，,；;\/\n]+/)
        .map(normalizeLabel)
        .filter((label) => label && label !== "无" && label !== "未知"),
    ),
  ]
    .slice(0, 8)
    .map((label) => ({
      id: interestIdFor(label),
      label,
      affinity: 72,
      momentum: 55,
      engagementCount: 0,
      lastEngagedTurn: -1,
      fatigue: 0,
      status: "active",
      source: "initial-profile",
    }));
}

export function normalizeInterests(raw, hobbies = "") {
  const source =
    Array.isArray(raw) && raw.length ? raw : parseInitialInterests(hobbies);
  const seen = new Set();
  return source
    .map((interest) => {
      const label = normalizeLabel(interest?.label || interest?.name);
      if (!label) return null;
      const id = String(interest.id || interestIdFor(label)).slice(0, 60);
      if (seen.has(id)) return null;
      seen.add(id);
      return {
        id,
        label,
        affinity: clamp(interest.affinity ?? 50),
        momentum: clamp(interest.momentum ?? 35),
        engagementCount: Math.max(0, Number(interest.engagementCount) || 0),
        lastEngagedTurn: Number(interest.lastEngagedTurn ?? -1),
        fatigue: clamp(interest.fatigue ?? 0),
        status: interest.status === "dormant" ? "dormant" : "active",
        source: String(interest.source || "life-experience").slice(0, 50),
      };
    })
    .filter(Boolean)
    .slice(0, 12);
}

const directionMultiplier = {
  favorable: 1,
  mixed: 0.55,
  stagnant: 0.2,
  adverse: -0.35,
};

const defaultEffects = (candidate = {}) =>
  (candidate.interestLinks || []).map((link) => ({
    interestId: link.interestId,
    label: link.label,
    action: link.mode === "discovery" ? "explore" : "engage",
    intensity: link.relevance,
  }));

export function advanceInterests(
  raw,
  { candidate = {}, decision = {}, outcome = {}, turn = 0 } = {},
) {
  const current = normalizeInterests(raw).map((interest) => ({
    ...interest,
    momentum: clamp(interest.momentum - 3),
    fatigue: clamp(interest.fatigue - 5),
    affinity:
      interest.lastEngagedTurn >= 0 && turn - interest.lastEngagedTurn > 8
        ? clamp(interest.affinity - 1)
        : interest.affinity,
  }));
  const effects =
    Array.isArray(decision.interestEffects) && decision.interestEffects.length
      ? decision.interestEffects
      : defaultEffects(candidate);
  const changes = [];
  for (const effect of effects.slice(0, 4)) {
    const label = normalizeLabel(effect.label);
    let index = current.findIndex(
      (interest) =>
        interest.id === effect.interestId ||
        (label && interest.label.toLowerCase() === label.toLowerCase()),
    );
    const action = ["engage", "explore", "avoid", "abandon"].includes(
      effect.action,
    )
      ? effect.action
      : "engage";
    const intensity = clamp(effect.intensity ?? 0.5, 0, 1);
    if (index < 0 && action === "explore" && label) {
      current.push({
        id: effect.interestId || interestIdFor(label),
        label,
        affinity: 44,
        momentum: 38,
        engagementCount: 0,
        lastEngagedTurn: -1,
        fatigue: 0,
        status: "active",
        source: `turn-${turn}`,
      });
      index = current.length - 1;
      changes.push({
        label,
        type: "discovered",
        delta: 0,
        reason: "生活中出现了新的真实接触",
      });
    }
    if (index < 0) continue;
    const interest = current[index];
    const outcomeFactor = directionMultiplier[outcome.direction] ?? 0.2;
    let affinityDelta = 0;
    let momentumDelta = 0;
    let fatigueDelta = 0;
    if (["engage", "explore"].includes(action)) {
      affinityDelta = Math.round(intensity * 4 * outcomeFactor);
      momentumDelta = Math.round(10 + intensity * 18);
      fatigueDelta = Math.round(intensity * 12);
    } else if (action === "avoid") {
      affinityDelta = intensity >= 0.7 ? -1 : 0;
      momentumDelta = -Math.round(5 + intensity * 8);
    } else {
      affinityDelta = -Math.round(4 + intensity * 6);
      momentumDelta = -Math.round(12 + intensity * 15);
    }
    const nextAffinity = clamp(interest.affinity + affinityDelta);
    const nextMomentum = clamp(interest.momentum + momentumDelta);
    const nextStatus =
      nextAffinity < 30 || action === "abandon" ? "dormant" : "active";
    current[index] = {
      ...interest,
      affinity: nextAffinity,
      momentum: nextMomentum,
      fatigue: clamp(interest.fatigue + fatigueDelta),
      engagementCount:
        interest.engagementCount +
        (["engage", "explore"].includes(action) ? 1 : 0),
      lastEngagedTurn: ["engage", "explore"].includes(action)
        ? turn
        : interest.lastEngagedTurn,
      status: nextStatus,
    };
    changes.push({
      label: interest.label,
      type: action,
      delta: affinityDelta,
      momentumDelta,
      status: nextStatus,
      reason:
        action === "abandon"
          ? "人物主动放下了这项兴趣"
          : action === "avoid"
            ? "本轮选择没有继续投入"
            : outcome.direction === "adverse"
              ? "真实受挫削弱了兴趣，但没有自动清零"
              : "实际投入改变了兴趣强度",
    });
  }
  return {
    interests: current
      .sort(
        (a, b) =>
          b.affinity + b.momentum * 0.35 - (a.affinity + a.momentum * 0.35),
      )
      .slice(0, 12),
    changes: changes.slice(-6),
  };
}

export function summarizeInterests(interests = [], limit = 6) {
  return normalizeInterests(interests)
    .filter((interest) => interest.status === "active")
    .sort(
      (a, b) =>
        b.affinity + b.momentum * 0.35 - (a.affinity + a.momentum * 0.35),
    )
    .slice(0, limit)
    .map((interest) => interest.label)
    .join("、");
}

export function interestFitForLinks(links = [], interests = []) {
  if (!links.length) return 0;
  const normalized = normalizeInterests(interests);
  let total = 0;
  let weight = 0;
  for (const link of links) {
    const relevance = clamp(link.relevance ?? 0.5, 0, 1);
    const interest = normalized.find(
      (item) =>
        item.id === link.interestId ||
        item.label === normalizeLabel(link.label),
    );
    const fit = interest
      ? ((interest.affinity - 50) / 25 + (interest.momentum - 40) / 80) *
        (interest.status === "active" ? 1 : 0.35)
      : link.mode === "discovery"
        ? 0
        : -0.8;
    total += fit * relevance;
    weight += relevance;
  }
  return weight ? total / weight : 0;
}
