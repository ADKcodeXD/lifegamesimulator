export const SKILL_TIERS = {
  basic: {
    level: 1,
    label: "基本技能",
    description: "可独立完成的日常能力",
  },
  technical: {
    level: 2,
    label: "技术技能",
    description: "需要训练、教育或职业实践",
  },
  composite: {
    level: 3,
    label: "复合技能",
    description: "融合多项能力与长期经验",
  },
} as const;

export const CANONICAL_SKILLS = {
  做饭: { tier: "basic", patterns: ["做饭", "烹饪", "厨艺"] },
  唱歌: { tier: "basic", patterns: ["唱歌", "声乐", "演唱"] },
  画画: { tier: "basic", patterns: ["画画", "绘画", "素描", "插画"] },
  写作: { tier: "basic", patterns: ["日常写作", "基础写作", "写作"] },
  运动: { tier: "basic", patterns: ["运动", "健身", "跑步", "游泳"] },

  电焊: { tier: "technical", patterns: ["电焊", "焊接"] },
  电工: { tier: "technical", patterns: ["电工", "电气维修", "电路维修"] },
  医生: { tier: "technical", patterns: ["医生", "医疗", "临床", "诊疗"] },
  编程: { tier: "technical", patterns: ["编程", "程序开发", "软件开发"] },
  数据分析: { tier: "technical", patterns: ["数据分析", "数据处理"] },
  视频剪辑: { tier: "technical", patterns: ["视频剪辑", "后期制作"] },
  机械维修: {
    tier: "technical",
    patterns: ["机械维修", "设备维修", "硬件维护"],
  },

  AI专家: {
    tier: "composite",
    patterns: [
      "ai",
      "人工智能",
      "大模型",
      "llm",
      "rlhf",
      "多模态",
      "机器学习",
      "深度学习",
      "模型微调",
      "推理优化",
      "具身智能",
    ],
  },
  管理经验: {
    tier: "composite",
    patterns: [
      "管理经验",
      "团队管理",
      "项目管理",
      "技术统筹",
      "团队统筹",
      "团队测试",
      "协同研发",
      "流程管理",
    ],
  },
  大厂面试官: {
    tier: "composite",
    patterns: [
      "大厂面试官",
      "面试官",
      "面试技巧",
      "人才评估",
      "专题访谈",
      "深度访谈",
    ],
  },
  自媒体专家: {
    tier: "composite",
    patterns: ["自媒体", "内容运营", "短视频运营", "账号运营", "直播运营"],
  },
  写稿人: {
    tier: "composite",
    patterns: ["写稿", "文案", "稿件", "专栏写作", "创意写作", "文献综述"],
  },
} as const;

export const SKILL_LIMITS = {
  perTier: 4,
  total: 12,
};

export const COMPOSITE_DOMINATES = {
  AI专家: ["编程", "数据分析"],
  自媒体专家: ["视频剪辑"],
  写稿人: ["写作"],
} as const;
