import { describeAbilityScore, describeScore } from "./scoreCalibration.js";
import { interestFitForLinks } from "./interestModel.js";

const clamp = (value, min = 0, max = 1) =>
  Math.max(min, Math.min(max, Number(value) || 0));

const weightedPick = (entries, random) => {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random() * total;
  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return value;
  }
  return entries.at(-1)[0];
};

const driveScores = (settings, state) => ({
  好奇: describeScore(settings.traits?.好奇 ?? 50).zScore,
  安全: describeScore(settings.traits?.决策风格 ?? 50).zScore,
  家庭: describeScore(settings.traits?.家庭 ?? 50).zScore,
  自主: -describeScore(settings.traits?.家庭 ?? 50).zScore * 0.45,
  归属:
    describeAbilityScore("社交", settings.talents?.社交 ?? 50).zScore * 0.35,
  兴趣: 1,
  emotion: (Number(state.emotion ?? state.mood ?? 72) - 50) / 25,
});

export function resolveCharacterDecision(
  candidate,
  payload,
  random = Math.random,
) {
  const drives = driveScores(payload.settings, payload.state);
  const choices = candidate.choices.length
    ? candidate.choices
    : [
        {
          id: "continue",
          action: "按当前节奏继续生活",
          drives: {},
          effort: 0.3,
        },
      ];
  const scored = choices.map((choice) => {
    const alignment = Object.entries(choice.drives || {}).reduce(
      (sum, [key, weight]) => sum + (drives[key] || 0) * Number(weight || 0),
      0,
    );
    const actionCapacity = clamp(0.55 + drives.emotion * 0.18, 0.15, 1.1);
    const interestEffects = choice.interestEffects || [];
    const interestAlignment = interestEffects.length
      ? interestEffects.reduce((sum, effect) => {
          const fit = interestFitForLinks(
            [
              {
                interestId: effect.interestId,
                label: effect.label,
                mode: effect.action === "explore" ? "discovery" : "existing",
                relevance: effect.intensity,
              },
            ],
            payload.simulation?.interests,
          );
          const direction = ["avoid", "abandon"].includes(effect.action)
            ? -1
            : 1;
          return sum + fit * direction;
        }, 0) / interestEffects.length
      : 0;
    const effortCost =
      Number(choice.effort || 0) * Math.max(0, 0.75 - actionCapacity);
    const utility =
      alignment +
      interestAlignment * 0.55 +
      actionCapacity * 0.45 -
      effortCost +
      (random() - 0.5) * 0.7;
    return { ...choice, utility, interestAlignment };
  });
  const selected = weightedPick(
    scored.map((choice) => [choice, Math.exp(choice.utility / 0.9)]),
    random,
  );
  return {
    selected,
    utilities: scored.map((choice) => ({
      id: choice.id,
      action: choice.action,
      utility: Number(choice.utility.toFixed(3)),
      interestAlignment: Number(choice.interestAlignment.toFixed(3)),
    })),
  };
}

const abilityEffect = (weights, settings) => {
  const entries = Object.entries(weights || {});
  if (!entries.length) return { value: 0, factors: [] };
  let weightTotal = 0;
  let effect = 0;
  const factors = entries.map(([name, weight]) => {
    const score = describeAbilityScore(name, settings.talents?.[name] ?? 50);
    const contribution = score.zScore * Number(weight || 0);
    effect += contribution;
    weightTotal += Math.abs(Number(weight || 0));
    return { name, score: score.score, weight, contribution };
  });
  return { value: weightTotal ? effect / weightTotal : 0, factors };
};

export function resolveEventOutcome(
  candidate,
  decision,
  payload,
  random = Math.random,
) {
  const performance = abilityEffect(
    candidate.demands?.performance,
    payload.settings,
  );
  const consequence = abilityEffect(
    candidate.demands?.consequence,
    payload.settings,
  );
  const emotion =
    (Number(payload.state.emotion ?? payload.state.mood ?? 72) - 50) / 50;
  const effort = Number(decision.selected?.effort ?? 0.5);
  const difficulty = Number(candidate.difficulty ?? 0.5);
  const signal =
    performance.value * 0.34 +
    consequence.value * 0.12 +
    emotion * 0.22 +
    effort * 0.35 -
    difficulty * 0.65;
  const favorable = clamp(0.24 + signal * 0.16, 0.06, 0.62);
  const adverse = clamp(
    0.2 - signal * 0.12 + candidate.stakes * 0.08,
    0.07,
    0.5,
  );
  const stagnant = clamp(
    0.24 - effort * 0.08 - Math.abs(signal) * 0.04,
    0.08,
    0.32,
  );
  const mixed = clamp(1 - favorable - adverse - stagnant, 0.12, 0.48);
  const raw = { favorable, mixed, adverse, stagnant };
  const total = Object.values(raw).reduce((sum, value) => sum + value, 0);
  const probabilities = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, value / total]),
  );
  const direction = weightedPick(Object.entries(probabilities), random);
  const directives = {
    favorable: "行动取得了与条件相称的实质进展，但仍保留现实成本。",
    mixed: "行动同时产生实质收益和实质代价，两者都必须结算。",
    adverse: "行动遭遇可延续的受挫或损失，不能被包装成净成功。",
    stagnant: "本轮没有关键突破，允许平淡、等待、重复劳动或尝试未果。",
  };
  return {
    direction,
    label: {
      favorable: "有利",
      mixed: "得失并存",
      adverse: "不利",
      stagnant: "停滞/平淡",
    }[direction],
    directive: directives[direction],
    probabilities,
    factors: {
      signal,
      effort,
      difficulty,
      performance: performance.factors,
      consequence: consequence.factors,
    },
    rollSource: "seeded-event-resolution",
  };
}
