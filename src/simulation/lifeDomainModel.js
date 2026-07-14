import { deriveTalentPathways } from "./talentPathways.js";
import { describeEmotion, normalizeEmotion } from "./emotionModel.js";

const DOMAIN_DEFINITIONS = {
  daily: {
    label: "日常生活与休息",
    patterns: /日常|休息|宅家|发呆|整理|睡眠|生活/,
    guidance: "允许没有产出的生活：休息、做饭、闲逛、整理房间、沉迷爱好或单纯放空。",
  },
  leisure: {
    label: "娱乐与社交",
    patterns: /娱乐|聚会|游戏|电影|音乐|酒吧|社交|朋友/,
    guidance: "安排符合年龄和人格的娱乐或社交，允许花钱、尽兴、尴尬、熬夜或第二天后悔。",
  },
  travel: {
    label: "旅行与探索",
    patterns: /旅行|出游|徒步|露营|度假|探店|远行/,
    guidance: "考虑时间、现金、身体和同伴条件，发生一次现实可行的出游、探索或临时远行。",
  },
  intimacy: {
    label: "恋爱与亲密关系",
    patterns: /恋爱|约会|暧昧|暗恋|亲密|分手|婚姻/,
    guidance: "让吸引、孤独、依恋、边界或伴侣互动成为主线，而不是事业剧情的附属品。",
  },
  family: {
    label: "家庭生活",
    patterns: /家庭|父母|子女|育儿|照护|家人/,
    guidance: "聚焦家人独立需求、共同生活、照护、冲突或温和日常，不强行导向事业收益。",
  },
  health: {
    label: "身体与心理状态",
    patterns: /健康|生病|运动|心理|睡眠|治疗|体检/,
    guidance: "身体感受、心理状态、运动、看病或恢复成为本轮核心，并产生时间和消费成本。",
  },
  consumption: {
    label: "消费与生活方式",
    patterns: /消费|购物|购买|装修|数码|衣服|餐饮|住房/,
    guidance: "人物可以为喜欢、体面、便利或一时冲动消费，不要求每笔钱都产生投资回报。",
  },
  career: {
    label: "工作与事业",
    patterns: /工作|事业|入职|升职|创业|副业|项目|职业/,
    guidance: "只有现实压力或机会足够强时才让事业成为主线，不默认努力必有成长。",
  },
  learning: {
    label: "学习与求知",
    patterns: /学习|读书|考试|课程|学校|升学|训练/,
    guidance: "学习可以进步、走神、厌倦、转兴趣或无功而返，不自动兑换成技能。",
  },
  talent: {
    label: "天赋赛道与专项发展",
    patterns: /天赋|专项|校队|体校|俱乐部|竞赛|表演|舞蹈|器乐|绘画|编程|创作|选拔/,
    guidance: "让突出的能力通过真实入口被发现、训练或错过；不默认回到课内成绩，也不保证成功。",
  },
};

const weightedPick = (items, random = Math.random) => {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = random() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
};

export function buildLifeDomainField(
  settings,
  logs = [],
  age = 18,
  random = Math.random,
  state = {},
) {
  const recentText = logs
    .slice(-3)
    .map((entry) => `${entry.tag || ""}${entry.title || ""}`)
    .join(" ");
  const talentPathways = deriveTalentPathways(settings, age);
  const emotion = describeEmotion(normalizeEmotion(state));
  const talentWeightBoost = Math.min(
    42,
    talentPathways.reduce(
      (sum, pathway) => sum + Math.max(0, pathway.score - 65) * 0.7,
      0,
    ),
  );
  const adultWeights = {
    daily: 19,
    leisure: 20,
    travel: 14,
    intimacy: 16,
    family: 13,
    health: 10,
    consumption: 15,
    career: 3,
    learning: 2,
    talent: 5 + talentWeightBoost * 0.35,
  };
  const youthWeights = {
    daily: 16,
    leisure: 20,
    travel: 8,
    intimacy: age >= 12 ? 13 : 5,
    family: 14,
    health: 8,
    consumption: 8,
    career: 1,
    learning: 12,
    talent: 5 + talentWeightBoost,
  };
  const baseWeights = age < 18 ? youthWeights : adultWeights;
  const candidates = Object.entries(DOMAIN_DEFINITIONS).map(
    ([key, definition]) => {
      const repeated = definition.patterns.test(recentText);
      const careerLoop =
        ["career", "learning"].includes(key) &&
        /工作|事业|项目|学习|考试|读书|课程/.test(recentText);
      const activeDomain = [
        "travel",
        "consumption",
        "career",
        "learning",
        "talent",
      ].includes(key);
      const recoveryDomain = ["daily", "health", "family"].includes(key);
      const emotionWeight = activeDomain
        ? Math.max(0.25, emotion.actionMultiplier)
        : recoveryDomain
          ? 1 + Math.max(0, 1 - emotion.actionMultiplier) * 1.6
          : 1;
      return {
        key,
        ...definition,
        weight:
          baseWeights[key] * (repeated ? 0.2 : 1) * (careerLoop ? 0.2 : 1),
        emotionWeight,
      };
    },
  );
  candidates.forEach((candidate) => {
    candidate.weight *= candidate.emotionWeight;
  });
  const selected = weightedPick(candidates, random);
  const pathwayGuidance = talentPathways.length
    ? `${talentPathways.map((item) => `${item.label}（${item.score}）`).join("、")}。${talentPathways[0].guidance}`
    : selected.guidance;
  return {
    freedomLevel: settings.freedomLevel || "high",
    selected: {
      key: selected.key,
      label: selected.label,
      guidance: selected.key === "talent" ? pathwayGuidance : selected.guidance,
    },
    talentPathways,
    emotion,
    weights: Object.fromEntries(candidates.map((item) => [item.key, item.weight])),
    recentFocusPenalty: candidates
      .filter((item) => item.weight < baseWeights[item.key])
      .map((item) => item.label),
  };
}
