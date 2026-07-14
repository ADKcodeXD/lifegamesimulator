import { parentsForFamily } from "./family.js";
import {
  createInitialPersonalityProfile,
  normalizePersonalityProfile,
} from "../simulation/personalityModel.js";

export const DEFAULT_CONSTRAINTS = [
  { age: 24, title: "可能面临首次购房与房贷选择", tone: "orange" },
  { age: 28, title: "可能面临婚恋或不婚压力", tone: "pink" },
];
export const TALENT_TIPS = {
  颜值: "影响社交第一印象、恋爱概率和人脉拓展",
  运动: "影响健康恢复速度、体育相关机会和抗压能力",
  智力: "影响理解速度、复杂问题处理和高认知职业机会",
  天赋: "合并先天潜能与技能成长，影响学习、实践、职业表现和成长上限",
  财商: "影响消费判断、投资风险、债务管理和资产积累",
  社交: "综合情商、共情与社交能力，影响关系建立、沟通协作和冲突处理",
};
export const TRAIT_TIPS = {
  决策风格: "低分更冒险冲动，高分更理性审慎，50表示两者平衡",
  家庭: "影响家庭关系维护、婚恋决策和亲情投入",
  好奇: "影响探索新机会的动力、学习意愿和转行勇气",
};
export const FREEDOM_LEVELS = {
  low: {
    label: "低",
    optionCount: 2,
    approvalChance: 0.08,
    description: "每次分岔提供 2 个方案，支线较少，人生推进更快。",
    prompt:
      "行动空间较集中。优先当前生活圈内最直接、最现实的路径，每轮避免同时开启多条支线。",
  },
  medium: {
    label: "中",
    optionCount: 3,
    approvalChance: 0.16,
    description: "每次分岔提供 3 个方案，在稳定推进与探索之间平衡。",
    prompt:
      "行动空间适中。既考虑惯常路径，也允许一条符合人物条件的新方向。",
  },
  high: {
    label: "高",
    optionCount: 4,
    approvalChance: 0.28,
    description: "每次分岔提供 4 个方案，支线更多，出现分岔也更频繁。",
    prompt:
      "行动空间宽广。主动考虑跨圈层、转行、副业、迁移、关系推进或拒绝等不同路径，但最终决定仍须符合人物与现实条件。",
  },
};
export const normalizeSettings = (s = {}) => {
  const family = s.family || "modest";
  const freedomLevel = "high";
  const legacyTalents = s.talents || {};
  const legacyTraits = s.traits || {};
  const mergedTalent =
    legacyTalents.天赋 != null && legacyTalents.技能 != null
      ? Math.round((Number(legacyTalents.天赋) + Number(legacyTalents.技能)) / 2)
      : Number(legacyTalents.天赋 ?? legacyTalents.技能 ?? 65);
  const mergedDecisionStyle =
    legacyTraits.决策风格 != null
      ? Number(legacyTraits.决策风格)
      : Math.round(
          (Number(legacyTraits.理性 ?? 72) +
            (100 - Number(legacyTraits.冒险 ?? 38))) /
            2,
        );
  const defaultTalents = {
    颜值: 55,
    运动: 48,
    智力: 62,
    天赋: 65,
    财商: 50,
    社交: 50,
  };
  const normalizedTalents = {
    颜值: Number(legacyTalents.颜值 ?? defaultTalents.颜值),
    运动: Number(legacyTalents.运动 ?? defaultTalents.运动),
    智力: Number(legacyTalents.智力 ?? defaultTalents.智力),
    天赋: mergedTalent,
    财商: Number(legacyTalents.财商 ?? defaultTalents.财商),
    社交: Number(legacyTalents.社交 ?? defaultTalents.社交),
  };
  const normalizedTraits = {
    决策风格: mergedDecisionStyle,
    家庭: Number(legacyTraits.家庭 ?? 64),
    好奇: Number(legacyTraits.好奇 ?? 81),
  };
  const defaultHeight = s.gender === "女" ? 163 : 175;
  const settings = {
    world:
      "2026 年，中国一座人口约 400 万的二线城市。AI 加速渗透就业市场，房地产从普涨转向分化。",
    name: "",
    gender: "男",
    family,
    initialCash: 1000,
    talents: defaultTalents,
    physicalProfile: {
      adultHeightCm: defaultHeight,
      initialBodyType: "匀称",
    },
    bio: DEFAULT_MALE_BIO,
    startAge: 18,
    endAge: 80,
    monthsPerTurn: 6,
    freedomLevel,
    traits: normalizedTraits,
    constraints: DEFAULT_CONSTRAINTS,
    ...s,
    family,
    freedomLevel,
    talents: normalizedTalents,
    traits: normalizedTraits,
    physicalProfile: {
      adultHeightCm:
        Number(s.physicalProfile?.adultHeightCm) || defaultHeight,
      initialBodyType: s.physicalProfile?.initialBodyType || "匀称",
    },
    parents: s.parents?.length ? s.parents : parentsForFamily(family),
  };
  return {
    ...settings,
    personalityProfile: s.personalityProfile
      ? normalizePersonalityProfile(s.personalityProfile, settings)
      : createInitialPersonalityProfile(settings),
  };
};
export const CITY_PRESETS = {
  中国: [
    {
      name: "北京",
      seed: "2026 年，中国首都北京。AI 与互联网行业高度集中，房价居高不下，竞争激烈但机会密集，户口制度仍影响生活成本与教育资源获取。",
    },
    {
      name: "上海",
      seed: "2026 年，中国经济中心上海。金融、外贸与科技交汇，国际化程度高，生活成本极高，但职业天花板也更高，适合有野心的年轻人。",
    },
    {
      name: "深圳",
      seed: "2026 年，中国创新之都深圳。科技创业氛围浓厚，年轻人比例高，房价压力大但收入水平也高，草根逆袭的故事仍在上演。",
    },
    {
      name: "成都",
      seed: "2026 年，中国西南中心城市成都，人口约 2100 万。生活节奏相对舒适，新经济与传统产业并存，房价适中，年轻人在'躺平'与奋斗间寻找平衡。",
    },
    {
      name: "杭州",
      seed: "2026 年，中国电商与数字经济重镇杭州。互联网大厂云集，创业机会多，房价紧追一线，AI 加速渗透各行业。",
    },
    {
      name: "武汉",
      seed: "2026 年，中国中部枢纽武汉，高校众多。制造业与科技产业并行发展，生活成本适中，大学生留汉政策持续推进。",
    },
    {
      name: "二线城市",
      seed: "2026 年，中国一座人口约 400 万的二线城市。AI 加速渗透就业市场，房地产从普涨转向分化，普通家庭风险承受能力有限。",
    },
    {
      name: "小县城",
      seed: "2026 年，中国内陆一个人口约 50 万的小县城。传统产业为主，就业机会有限，人情社会浓厚，年轻人面临留守还是外出打工的抉择。",
    },
  ],
  美国: [
    {
      name: "纽约",
      seed: "2026 年，美国纽约。全球金融中心，生活成本极高，文化多元，机会与压力并存，移民需面对身份、语言和文化适应挑战。",
    },
    {
      name: "旧金山",
      seed: "2026 年，美国硅谷/旧金山湾区。全球科技创新中心，AI 浪潮席卷，高薪但高房价，裁员潮与创业潮交替上演。",
    },
  ],
  日本: [
    {
      name: "东京",
      seed: "2026 年，日本东京。老龄化社会加深，终身雇佣制逐渐瓦解，AI 正改变职场文化，生活精致但社会压力大，年轻人面临低欲望与高物价的矛盾。",
    },
  ],
  韩国: [
    {
      name: "首尔",
      seed: "2026 年，韩国首尔。内卷文化深入骨髓，学历至上但就业困难，房价飙升，年轻人在财阀经济体系中寻找生存空间。",
    },
  ],
  新加坡: [
    {
      name: "新加坡",
      seed: "2026 年，新加坡。亚洲金融与科技枢纽，高度国际化，生活成本极高但治安良好，精英主义与多元文化并存。",
    },
  ],
};

export const DEFAULT_MALE_BIO = {
  childhood:
    "生于南方二线城市，父母皆为基层职员。因外貌平凡且体能较弱，儿时极少在院子里疯跑，更多时间蹲在阳台拆解旧收音机和闹钟，由此对机械结构产生了浓厚兴趣。",
  school:
    "初高中学业表现平庸，在对抗性体育课上常显得局促。但他通过自学掌握了精湛的视频剪辑与硬件维护技能，成了班级幕后的“技术支持”，在安静的机房里建立了自信。",
  personality:
    "技能上的特长弥补了社交与身体素能的平淡，形成了踏实务实、遇事冷静但略显内敛的性格。",
  hobbies: "数码产品测评、电脑组装、胶板模型、近郊骑行",
  dream: "找一份稳定的技术工作，攒钱买一台自己组装的高配电脑",
};
export const DEFAULT_FEMALE_BIO = {
  childhood:
    "生于北方省会城市，父亲是中学教师，母亲在社区卫生站工作。小时候乖巧安静，喜欢赴在书桌前画画和写日记，偶尔帮母亲整理药品标签，养成了细致耐心的习惯。",
  school:
    "初中成绩中上，高中文理分科时选了文科。性格温和但有主见，是班级里默默付出的学习委员。课余时间自学了摄影和平面设计，在校园活动中负责海报和推文排版。",
  personality:
    "细腻敏感但不脆弱，习惯用文字和图像记录生活，对美有天然的感知力，社交不算广泛但朋友关系稳固。",
  hobbies: "手账绘制、人像摄影、咖啡探店、阅读心理学书籍",
  dream: "成为一名自由设计师，开一间属于自己的小工作室",
};
