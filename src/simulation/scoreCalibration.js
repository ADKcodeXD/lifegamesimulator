export const SCORE_MEAN = 50;
export const SCORE_STANDARD_DEVIATION = 15;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const erf = (value) => {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value);
  const t = 1 / (1 + 0.3275911 * x);
  const approximation =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t -
      0.284496736) *
      t +
      0.254829592) *
      t) *
      Math.exp(-x * x);
  return sign * approximation;
};

const normalCdf = (zScore) => (1 + erf(zScore / Math.sqrt(2))) / 2;

const levelForZScore = (zScore) => {
  if (zScore < -2) return { key: "extremelyLow", label: "极低" };
  if (zScore < -1) return { key: "low", label: "明显低于平均" };
  if (zScore < -1 / 3) return { key: "belowAverage", label: "略低于平均" };
  if (zScore <= 1 / 3) return { key: "average", label: "普通平均" };
  if (zScore < 1) return { key: "aboveAverage", label: "略高于平均" };
  if (zScore < 2) return { key: "excellent", label: "显著高于平均" };
  if (zScore < 2.5) return { key: "rare", label: "罕见拔尖" };
  return { key: "prodigy", label: "极罕见·奇才级" };
};

export function describeScore(value, { multiplierPower = 0.6 } = {}) {
  const score = clamp(Number(value) || 0, 0, 100);
  const zScore = (score - SCORE_MEAN) / SCORE_STANDARD_DEVIATION;
  const percentile = normalCdf(zScore) * 100;
  const level = levelForZScore(zScore);
  const multiplier = clamp(2 ** (zScore * multiplierPower), 0.35, 4.5);
  return {
    score,
    zScore,
    percentile,
    percentileLabel: `约高于${percentile.toFixed(1)}%的人`,
    levelKey: level.key,
    level: level.label,
    multiplier,
  };
}

const TOP_ABILITY_LABELS = {
  颜值: "极罕见外貌条件，足以显著改变第一印象、曝光与部分职业机会",
  运动: "奇才级身体与运动禀赋，具备专业竞技、恢复和高强度训练潜力",
  智力: "极高认知潜力，复杂推理、理解速度和跨领域迁移显著异于常人",
  天赋: "奇才级潜能与技能成长能力，适配领域可能形成行业头部表现",
  财商: "极罕见财务直觉与风险定价能力，但仍不能消除市场风险",
  社交: "极罕见的共情、沟通与关系经营能力，能显著改变协作和人际机会",
};

const ABILITY_DOMAINS = {
  颜值: "外貌与第一印象",
  运动: "身体、运动与恢复",
  智力: "理解、推理与学习迁移",
  天赋: "潜能、技能成长与职业实践",
  财商: "预算、债务、投资与风险识别",
  社交: "情商、共情、沟通与关系经营",
};

export function describeAbilityScore(name, value) {
  const power = {
    颜值: 0.65,
    运动: 0.6,
    智力: 0.57,
    天赋: 0.65,
    财商: 0.57,
    社交: 0.6,
  }[name] || 0.6;
  const calibration = describeScore(value, { multiplierPower: power });
  const domain = ABILITY_DOMAINS[name] || name;
  let implication = `${domain}处于人群普通水准，不形成稳定优势或劣势`;
  if (calibration.levelKey === "prodigy") {
    implication = TOP_ABILITY_LABELS[name] || `${domain}达到极罕见的奇才级水准`;
  } else if (["rare", "excellent"].includes(calibration.levelKey)) {
    implication = `${domain}形成显著且少见的现实优势`;
  } else if (calibration.levelKey === "aboveAverage") {
    implication = `${domain}略有优势，但仍需要训练和机会兑现`;
  } else if (["belowAverage", "low", "extremelyLow"].includes(calibration.levelKey)) {
    implication = `${domain}弱于普通人平均，需要更多训练、支持或替代路径`;
  }
  return {
    ...calibration,
    label: `${calibration.level}：${implication}`,
  };
}

export function buildScoreContext(settings = {}) {
  return {
    scale: {
      mean: SCORE_MEAN,
      standardDeviation: SCORE_STANDARD_DEVIATION,
      rule: "50是普通人平均；每15分约等于1个标准差；分数表示相对人群位置，不是已拥有多少点能力",
    },
    abilities: Object.fromEntries(
      Object.entries(settings.talents || {}).map(([name, value]) => {
        const score = describeAbilityScore(name, value);
        return [
          name,
          {
            score: score.score,
            zScore: Number(score.zScore.toFixed(2)),
            percentile: Number(score.percentile.toFixed(1)),
            level: score.level,
            interpretation: score.label,
          },
        ];
      }),
    ),
    traits: Object.fromEntries(
      Object.entries(settings.traits || {}).map(([name, value]) => {
        const score = describeScore(value, { multiplierPower: 0.45 });
        return [
          name,
          {
            score: score.score,
            zScore: Number(score.zScore.toFixed(2)),
            percentile: Number(score.percentile.toFixed(1)),
            level: score.level,
            interpretation:
              name === "决策风格"
                ? `${score.score}分；低分偏冒险冲动，高分偏理性审慎，50表示相对平衡`
                : `${name}${score.level}；这是相对普通人的倾向强弱，不代表有或没有这种特质`,
          },
        ];
      }),
    ),
  };
}

export function calculateAbilityOpportunity(model = {}) {
  const multiplier = (key) => Number(model[key]?.multiplier) || 1;
  return clamp(
    (multiplier("intelligence") - 1) * 0.025 +
      (multiplier("talent") - 1) * 0.065 +
      (multiplier("financial") - 1) * 0.015 +
      (multiplier("social") - 1) * 0.018 +
      (multiplier("athletic") - 1) * 0.01 +
      (multiplier("appearance") - 1) * 0.008,
    -0.12,
    0.22,
  );
}
