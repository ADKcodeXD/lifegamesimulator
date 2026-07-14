import { deriveTalentPathways } from "./talentPathways.js";
import { describeEmotion, normalizeEmotion } from "./emotionModel.js";

const FAMILY_SCORE = {
  destitute: 0,
  poor: 1,
  modest: 2,
  middle: 3,
  affluent: 4,
  rich2nd: 5,
};

const option = (id, label, icon, description, baseWeight, tone = "blue") => ({
  id,
  label,
  icon,
  description,
  baseWeight,
  tone,
});

const OPTIONS_BY_STAGE = [
  {
    maxAge: 12,
    label: "童年探索期",
    options: [
      option("play", "尽情玩耍", "🪁", "把时间留给游戏、伙伴与好奇心", 68, "amber"),
      option("interest", "培养兴趣", "🎨", "尝试运动、音乐、阅读或动手创造", 64, "violet"),
      option("talent_track", "追随突出天赋", "🌟", "让真实天赋进入专项训练、作品或选拔赛道", 50, "green"),
      option("study", "专注学习", "📚", "建立学习习惯并争取更好的教育机会", 56, "blue"),
      option("family", "亲近家人", "🏠", "从家庭陪伴中获得安全感与支持", 62, "green"),
    ],
  },
  {
    maxAge: 18,
    label: "青春成长期",
    options: [
      option("study", "升学冲刺", "📚", "把精力押在考试与教育路径上", 66, "blue"),
      option("romance", "靠近喜欢的人", "💗", "允许暗恋、表达与亲密关系发生", 48, "rose"),
      option("gaming", "游戏与同伴", "🎮", "在同伴文化和娱乐中寻找归属", 55, "violet"),
      option("creator", "开始做自媒体", "📹", "公开表达、创作内容并积累受众", 38, "amber"),
      option("talent_track", "投入天赋赛道", "🌟", "在升学之外尝试竞技、表演、创作、技术或专项选拔", 42, "green"),
      option("rebellion", "叛逆试探", "🌙", "挑战边界，也可能接触烟酒与损友", 26, "slate"),
    ],
  },
  {
    maxAge: 25,
    label: "青年分岔期",
    options: [
      option("overseas", "出国留学", "✈️", "用家庭资源或奖学金换取国际教育", 34, "blue"),
      option("career", "进入职场", "💼", "积累职业资本、收入与独立生活能力", 70, "green"),
      option("startup", "尝试创业", "🚀", "把天赋、创意和资源押向一项事业", 38, "amber"),
      option("romance", "经营爱情", "💗", "主动靠近关系并学习承诺与边界", 52, "rose"),
      option("creator", "经营自媒体", "📹", "持续创作，把表达变成影响力或副业", 45, "violet"),
      option("gaming", "沉浸游戏社交", "🎮", "把更多时间留给游戏、朋友和线上娱乐", 34, "slate"),
    ],
  },
  {
    maxAge: 35,
    label: "立业与安家期",
    options: [
      option("career", "职业跃迁", "📈", "争取晋升、转行或进入更大的平台", 68, "green"),
      option("startup", "创业做事业", "🚀", "用积蓄、人脉或融资建立自己的业务", 45, "amber"),
      option("marriage", "走向婚姻", "💍", "推动稳定关系、共同生活与长期承诺", 54, "rose"),
      option("home", "购置住房", "🏡", "为稳定居所承担首付、房贷与城市选择", 49, "blue"),
      option("creator", "打造个人品牌", "📹", "通过内容、作品和专业影响力建立第二曲线", 42, "violet"),
      option("freedom", "保持自由生活", "🧭", "暂缓传统节点，把资源留给体验与自我", 40, "slate"),
    ],
  },
  {
    maxAge: 50,
    label: "责任与再选择期",
    options: [
      option("family", "经营家庭", "🏠", "投入伴侣、父母与孩子的长期关系", 65, "rose"),
      option("second_child", "考虑二胎", "🍼", "评估照护、住房、收入与家庭意愿", 34, "amber"),
      option("startup", "开启第二事业", "🚀", "利用经验和资源创业或发展副业", 45, "green"),
      option("assets", "配置大类资产", "🏡", "考虑房产、车辆、投资与家庭保障", 55, "blue"),
      option("health", "重建健康", "🏃", "把睡眠、运动与体检放回优先级", 61, "violet"),
      option("relationship_reset", "重审亲密关系", "💬", "修复、重建或结束不再合适的关系", 36, "slate"),
    ],
  },
  {
    maxAge: 65,
    label: "成熟转型期",
    options: [
      option("second_career", "发展第二曲线", "🌱", "咨询、教学、创业或转向更有意义的工作", 52, "green"),
      option("health", "守住健康", "🏃", "稳定运动、治疗与生活节律", 72, "violet"),
      option("family", "照护家庭", "🏠", "处理父母养老、伴侣支持与子女成长", 66, "rose"),
      option("assets", "退休资产规划", "📊", "降低脆弱性并安排长期现金流", 63, "blue"),
      option("travel", "旅行与迁居", "🧳", "重新选择生活城市、节奏与见闻", 38, "amber"),
    ],
  },
  {
    maxAge: Infinity,
    label: "晚年意义期",
    options: [
      option("health", "维持身心健康", "🌿", "以可持续的节奏管理身体与情绪", 78, "green"),
      option("family", "陪伴家人", "🏠", "把时间留给伴侣、孩子与孙辈", 72, "rose"),
      option("legacy", "留下作品与经验", "✍️", "写作、教学、公益或传承一门手艺", 54, "violet"),
      option("travel", "体验新的生活", "🧳", "在身体允许时旅行、迁居或结识新朋友", 40, "amber"),
      option("assets", "安排财富传承", "📜", "梳理养老、医疗与家人之间的资产安排", 58, "blue"),
    ],
  },
];

export function getDirectionChoices({ age, settings = {}, state = {}, relations = [], resume = {} }) {
  const stage = OPTIONS_BY_STAGE.find((item) => age < item.maxAge) || OPTIONS_BY_STAGE.at(-1);
  const familyScore = FAMILY_SCORE[settings.family] ?? 2;
  const traits = settings.traits || {};
  const decisionStyle = Number(traits.决策风格 ?? 50);
  const social = Number(settings.talents?.社交 ?? 50);
  const emotion = describeEmotion(normalizeEmotion(state));
  const weights = settings.directionPreferences?.weights || {};
  const hasPartner = relations.some((relation) => /伴侣|夫妻|妻子|丈夫|恋人|配偶/.test(`${relation.status || ""}${relation.relationToProtagonist || ""}`));
  const hasChild = relations.some((relation) => /儿子|女儿|孩子|子女/.test(`${relation.status || ""}${relation.relationToProtagonist || ""}${relation.name || ""}`));
  const ownsHome = Number(state.assets?.realEstate) > 0;
  const employed = /在职|自由职业|创业/.test(resume.employmentStatus || "");
  const talentPathways = deriveTalentPathways(settings, age);
  const leadPathway = talentPathways[0];

  const choices = stage.options.map((item) => {
    let fit = item.baseWeight + Number(weights[item.id] || 0);
    if (item.id === "overseas") fit += familyScore * 8 - 12;
    if (["startup", "travel", "freedom", "rebellion"].includes(item.id)) fit += (50 - decisionStyle) * 0.25;
    if (["study", "creator", "second_career"].includes(item.id)) fit += (Number(traits.好奇) - 50) * 0.2;
    if (["romance", "creator", "gaming", "relationship_reset"].includes(item.id)) fit += (social - 50) * 0.2;
    if (item.id === "talent_track") fit += Math.max(-20, (Number(leadPathway?.score || 50) - 50) * 0.65);
    if (["family", "marriage", "second_child"].includes(item.id)) fit += (Number(traits.家庭) - 50) * 0.25;
    if (item.id === "marriage" && hasPartner) fit += 18;
    if (item.id === "second_child") fit += hasPartner && hasChild ? 18 : hasPartner ? 4 : -28;
    if (item.id === "home") fit += ownsHome ? -25 : familyScore * 4;
    if (item.id === "career" && employed) fit += 8;
    if (!["health", "family"].includes(item.id)) {
      fit *= 0.55 + emotion.actionMultiplier * 0.45;
    }
    return {
      ...item,
      label: item.id === "talent_track" && leadPathway ? `探索${leadPathway.label}` : item.label,
      description: item.id === "talent_track" && leadPathway ? leadPathway.guidance : item.description,
      fit: Math.max(5, Math.min(99, Math.round(fit))),
      learnedWeight: Number(weights[item.id] || 0),
    };
  });

  if (emotion.value < 45) {
    choices.push({
      ...option(
        "emotional_recovery",
        "优先恢复情绪",
        "🌧️",
        emotion.crisisLevel === "critical"
          ? "暂停高负荷行动，优先确保安全并寻求可信任者或专业支持"
          : "降低负荷，通过休息、陪伴、求助或专业支持恢复行动力",
        0,
        "violet",
      ),
      fit: Math.min(99, Math.round(104 - emotion.value)),
      learnedWeight: Number(weights.emotional_recovery || 0),
    });
  }

  return {
    stage: stage.label,
    selectedId: settings.directionPreferences?.selectedId || null,
    choices: choices.sort((a, b) => b.fit - a.fit).slice(0, 6),
    talentPathways,
    emotion,
  };
}

export function selectDirection(settings, directionId, month) {
  const current = settings.directionPreferences || {};
  const weights = Object.fromEntries(
    Object.entries(current.weights || {}).map(([key, value]) => [key, Math.max(0, Math.round(Number(value) * 0.92))]),
  );
  weights[directionId] = Math.min(60, Number(weights[directionId] || 0) + 14);
  return {
    ...settings,
    directionPreferences: { ...current, weights, selectedId: directionId, selectedAtMonth: month },
  };
}

export function consumeSelectedDirection(settings) {
  if (!settings.directionPreferences?.selectedId) return settings;
  return {
    ...settings,
    directionPreferences: { ...settings.directionPreferences, selectedId: null },
  };
}
