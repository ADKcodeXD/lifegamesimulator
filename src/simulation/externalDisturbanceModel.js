import { describeAbilityScore } from "./scoreCalibration.js";

const clamp = (value, min = 0, max = 1) =>
  Math.max(min, Math.min(max, Number(value) || 0));

const forTurn = (annualProbability, months) =>
  1 - Math.pow(1 - clamp(annualProbability, 0, 0.8), months / 12);

const inheritedRisk = (turn, pattern, fallback) => {
  const matched = (turn?.riskShifts || [])
    .filter((item) => pattern.test(String(item.name || "")))
    .map((item) => Number(item.value) || 0);
  return matched.length ? Math.max(...matched) : fallback;
};

export function buildExternalDisturbanceField(payload, random = Math.random) {
  const months = payload.settings.monthsPerTurn || 6;
  const financial = describeAbilityScore(
    "财商",
    payload.settings.talents?.财商 ?? 50,
  );
  const athletic = describeAbilityScore(
    "运动",
    payload.settings.talents?.运动 ?? 50,
  );
  const definitions = [
    {
      key: "ordinary",
      label: "日常环境出现意外变化",
      valence: "mixed",
      annualProbability: 0.08,
    },
    {
      key: "opportunity",
      label: "外部机会进入当前生活圈",
      valence: "favorable",
      annualProbability:
        0.025 *
        (0.75 + inheritedRisk(payload.turn, /职业|机会|跃迁/, 18) / 100),
    },
    {
      key: "relationship",
      label: "关系网络受到外部扰动",
      valence: "mixed",
      annualProbability:
        0.035 * (0.8 + inheritedRisk(payload.turn, /关系|家庭|社交/, 12) / 100),
    },
    {
      key: "financial",
      label: "财务条件出现外部扰动",
      valence: "adverse",
      annualProbability:
        (0.022 *
          (0.8 + inheritedRisk(payload.turn, /财务|债务|失业/, 8) / 100)) /
        Math.max(0.7, financial.multiplier),
    },
    {
      key: "health",
      label: "身体条件出现外部扰动",
      valence: "adverse",
      annualProbability:
        (0.018 *
          (0.8 + inheritedRisk(payload.turn, /健康|疾病|伤病/, 14) / 100)) /
        Math.max(0.7, athletic.multiplier),
    },
  ];
  return definitions.map((definition) => {
    const probability = forTurn(definition.annualProbability, months);
    const roll = random();
    return {
      ...definition,
      probability,
      roll,
      triggered: roll < probability,
    };
  });
}
