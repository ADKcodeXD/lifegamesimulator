export const MBTI_LABELS = {
  ISTJ: "务实守序",
  ISFJ: "温和尽责",
  INFJ: "敏锐理想",
  INTJ: "独立规划",
  ISTP: "冷静实干",
  ISFP: "细腻随和",
  INFP: "重视内心",
  INTP: "好奇分析",
  ESTP: "果断应变",
  ESFP: "热情体验",
  ENFP: "开放探索",
  ENTP: "善于创新",
  ESTJ: "直接组织",
  ESFJ: "重视关系",
  ENFJ: "共情引导",
  ENTJ: "目标驱动",
} as const;

export const PERSONALITY_DIMENSIONS = {
  intimacy: "亲密关系",
  family: "家庭边界",
  social: "人际信任",
  selfWorth: "自我价值",
  security: "安全感",
  risk: "风险偏好",
} as const;

export const PERSONALITY_ADAPTATIONS = {
  romanticCaution: {
    dimension: "intimacy",
    title: "亲密关系戒备",
    tendency: "在亲密关系中更谨慎，需要更长时间确认承诺是否可信",
  },
  familyDefense: {
    dimension: "family",
    title: "家庭冲突防御",
    tendency: "面对家庭期待和批评时更容易进入防御状态",
  },
  socialCaution: {
    dimension: "social",
    title: "人际信任放缓",
    tendency: "建立新信任时更倾向先观察，再逐步投入",
  },
  trustRecovery: {
    dimension: "intimacy",
    title: "信任逐步修复",
    tendency: "在持续稳定的关系中，开始愿意重新表达需要与期待",
  },
} as const;

export const PERSONALITY_LIMITS = {
  adaptations: 6,
  history: 40,
};
