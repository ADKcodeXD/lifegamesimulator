import { createInitialState } from "../simulation/financeModel.js";

export const INITIAL_STATE = createInitialState();
export { createInitialState };
export const INITIAL_RELATIONS = [
  {
    name: "父亲",
    emoji: "👨🏻",
    value: 68,
    status: "期待",
    personality: "沉默寡言，传统保守，望子成龙但不善表达",
    age: 50,
    role: "工厂车间主任",
    background: "从小在农村长大，靠读书考上中专，分配进工厂，一辈子勤勤恳恳",
    motivation: "希望孩子出人头地，弥补自己人生的遗憾",
    relationToProtagonist: "严厉但深沉的父爱",
    potentialConflict: "对主角的职业选择和婚姻有强烈期待，容易产生代沟",
  },
  {
    name: "母亲",
    emoji: "👩🏻",
    value: 82,
    status: "亲密",
    personality: "温柔操心，节俭持家，偶尔唠叨但出发点是爱",
    age: 48,
    role: "小学教师",
    background: "师范毕业，教了一辈子小学语文，性格温和但原则性强",
    motivation: "希望孩子健康快乐，不要走弯路",
    relationToProtagonist: "无条件的母爱与关怀",
    potentialConflict: "过度关心有时让主角感到窒息，尤其在隐私和独立方面",
  },
];
export const INITIAL_SOCIAL_EDGES = [
  {
    source: "父亲",
    target: "母亲",
    value: 74,
    status: "夫妻",
    action: "共同承担家庭责任，也会因教育方式产生分歧",
  },
];

export const createInitialResume = (settings) => ({
  currentRole: (settings.startAge ?? 18) < 18 ? "在校学生" : "人生起步阶段",
  organization: "",
  employmentStatus: (settings.startAge ?? 18) < 23 ? "在校/待定" : "待业",
  education:
    (settings.startAge ?? 18) < 12
      ? "基础教育"
      : (settings.startAge ?? 18) < 18
        ? "中学阶段"
        : "高中毕业或同等阶段",
  skills: [],
  experiences: [],
});
export const BASE_NPC_PROFILES = Object.fromEntries(
  INITIAL_RELATIONS.map((r) => [
    r.name,
    {
      name: r.name,
      age: r.age,
      role: r.role,
      personality: r.personality,
      background: r.background,
      motivation: r.motivation,
      relationToProtagonist: r.relationToProtagonist,
      potentialConflict: r.potentialConflict,
    },
  ]),
);
export const createInitialNpcProfiles = (settings = {}) => ({
  ...BASE_NPC_PROFILES,
  ...Object.fromEntries(
    (settings.parents || []).map((parent) => [parent.name, { ...parent }]),
  ),
});
export const STATUS_TAGS = [
  { pattern: /求职|找工作|投简历|面试/, label: "求职中", cls: "" },
  {
    pattern: /在职|上班|工作|打工|兼职|送外卖|搬砖/,
    label: "在职",
    cls: "working",
  },
  {
    pattern: /读书|学习|上学|大学|考研|考试|培训|进修/,
    label: "读书中",
    cls: "studying",
  },
  { pattern: /创业|开店|开公司|做生意/, label: "创业中", cls: "entrepreneur" },
  { pattern: /gap|间隔|休整|迷茫|无业|待业|休息/, label: "Gap中", cls: "gap" },
  { pattern: /抑郁|焦虑|心理|崩溃|低落/, label: "抑郁", cls: "depressed" },
  { pattern: /生病|住院|手术|受伤|康复/, label: "生病", cls: "sick" },
];
export function getEducationStage(age) {
  if (age < 3) return { stage: "婴幼儿", icon: "👶", desc: "在家 / 托育" };
  if (age < 6) return { stage: "学龄前", icon: "🧒", desc: "幼儿园" };
  if (age < 12) return { stage: "小学", icon: "📚", desc: "义务教育阶段" };
  if (age < 15) return { stage: "初中", icon: "📖", desc: "义务教育阶段" };
  if (age < 18) return { stage: "高中", icon: "✏️", desc: "备考升学" };
  if (age < 23) return { stage: "大学", icon: "🎓", desc: "高等教育" };
  if (age < 26)
    return { stage: "深造/初入职场", icon: "💼", desc: "考研或工作起步" };
  return { stage: "职场", icon: "🏢", desc: "已进入社会" };
}
export function getCurrentActivity(turn, age) {
  const edu = getEducationStage(age);
  const tag = turn.tag || "";
  if (/读书|上学|学习|大学|考研|考试/.test(tag))
    return { label: "读书学习中", icon: "📖", desc: turn.decision || edu.desc };
  if (/创业|开店|开公司|做生意/.test(tag))
    return {
      label: "创业中",
      icon: "🚀",
      desc: turn.decision || "正在经营自己的事业",
    };
  if (/在职|上班|工作|打工|兼职/.test(tag))
    return {
      label: "工作中",
      icon: "💼",
      desc: turn.decision || "正在职场打拼",
    };
  if (/求职|找工作|投简历|面试/.test(tag))
    return {
      label: "求职中",
      icon: "📝",
      desc: turn.decision || "正在寻找工作机会",
    };
  if (/恋爱|约会|暧昧/.test(tag))
    return {
      label: "恋爱中",
      icon: "💕",
      desc: turn.decision || "感情生活活跃",
    };
  if (/gap|间隔|休整|迷茫|无业|待业|休息/.test(tag))
    return {
      label: "Gap中",
      icon: "🌿",
      desc: turn.decision || "正在探索方向",
    };
  if (/生病|住院|手术|受伤|康复/.test(tag))
    return { label: "养病中", icon: "🏥", desc: turn.decision || "正在康复" };
  if (/抑郁|焦虑|心理/.test(tag))
    return {
      label: "情绪低谷",
      icon: "🌧️",
      desc: turn.decision || "正在调整心理状态",
    };
  if (age < 18)
    return {
      label: edu.stage,
      icon: edu.icon,
      desc: turn.decision || edu.desc,
    };
  return {
    label: "自由探索",
    icon: "🧭",
    desc: turn.decision || "正在经历人生",
  };
}
export const money = (v) =>
  new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 }).format(v);
export const clamp = (v) => Math.max(0, Math.min(100, Math.round(v)));
export const avatarFor = (age, gender) => {
  if (age < 4) return "👶🏻";
  if (age < 12) return gender === "女" ? "👧🏻" : "👦🏻";
  if (age < 23) return gender === "女" ? "👩🏻‍🎓" : "🧑🏻‍🎓";
  if (age < 60) return gender === "女" ? "👩🏻" : "🧑🏻";
  return gender === "女" ? "👵🏻" : "👴🏻";
};

export const blankTurn = {
  title: "等待世界运转",
  tag: "尚未推演",
  event:
    "点击「推演下个月」，LLM 将根据当前世界、人格、关系、资产和历史，自主生成这个月发生的一切。",
  thought: "主角的思考摘要会显示在这里；不会展示模型的隐藏推理过程。",
  decision: "尚未做出决定",
  reason: "",
  summary: "",
  skillsGained: [],
  skillsUsed: [],
  skillsAvailable: [],
  physicalStatus: { label: "状态稳定", detail: "暂无明显身体异常" },
  learningStatus: {
    stage: "待观察",
    label: "暂无变化",
    detail: "尚未开始推演",
  },
  cashflow: 0,
  roi: "—",
  riskShifts: [
    { name: "职业跃迁", value: 18, trend: "持平" },
    { name: "财务危机", value: 8, trend: "持平" },
    { name: "健康事件", value: 14, trend: "持平" },
    { name: "关系冲击", value: 12, trend: "持平" },
  ],
  worldChange: null,
};
