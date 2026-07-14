import { describeAbilityScore } from "./scoreCalibration.js";

const PATHWAY_DEFINITIONS = {
  运动: {
    key: "athletic",
    label: "体育竞技与身体专项",
    examples: "校队、体校、俱乐部、专项教练、地区比赛",
  },
  颜值: {
    key: "performance",
    label: "表演、镜头与形象表达",
    examples: "戏剧、舞蹈、主持、童装展示、镜头表达",
  },
  智力: {
    key: "research",
    label: "竞赛、研究与高阶认知",
    examples: "学科竞赛、科学项目、棋类、研究性学习",
  },
  天赋: {
    key: "gifted",
    label: "天赋、技能与专项发展",
    examples: "编程、器乐、绘画、机械、手工、作品比赛与专业实践",
  },
  财商: {
    key: "enterprise",
    label: "经营、组织与商业实践",
    examples: "义卖、社团运营、旧物交换、项目预算、小型实践",
  },
  社交: {
    key: "social",
    label: "沟通、协作与公共表达",
    examples: "社团组织、主持、辩论、团队协作、关系协调与公共表达",
  },
};

const ageGuidance = (age, pathway) => {
  if (age < 6) {
    return `通过自由游戏、家庭观察和低压力体验发现${pathway.label}倾向，不做成人化职业安排`;
  }
  if (age < 12) {
    return `可经由${pathway.examples}获得真实接触；监护人、地域和家庭资源决定入口，但学校成绩不是唯一主线`;
  }
  if (age < 18) {
    return `可进入${pathway.examples}等更系统的训练或选拔，并真实面对时间冲突、家庭态度、伤病、落选和转轨`;
  }
  return `可将${pathway.label}发展为专业训练、作品路线、职业选择或长期副线`;
};

export function deriveTalentPathways(settings = {}, age = settings.startAge ?? 18) {
  return Object.entries(settings.talents || {})
    .map(([name, value]) => {
      const definition = PATHWAY_DEFINITIONS[name];
      if (!definition) return null;
      const calibration = describeAbilityScore(name, value);
      if (calibration.score < 65) return null;
      return {
        ...definition,
        source: name,
        score: calibration.score,
        percentile: Number(calibration.percentile.toFixed(1)),
        level: calibration.level,
        exceptional: calibration.score >= 80,
        prodigy: calibration.score >= 90,
        exposureBoost: Math.max(0, (calibration.score - 65) / 15),
        guidance: ageGuidance(Number(age), definition),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
