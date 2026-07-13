const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

const riskScore = (turn, pattern, fallback) => {
  const matches = (turn?.riskShifts || [])
    .filter((item) => pattern.test(String(item?.name || "")))
    .map((item) => Number(item?.value))
    .filter(Number.isFinite);
  return matches.length ? clamp(Math.max(...matches), 0, 100) : fallback;
};

const riskMultiplier = (score) => clamp(0.65 + score / 55, 0.55, 2.25);

const band = (value, bands) =>
  bands.find((item) => value < item.max) || bands[bands.length - 1];

const SCORE_BANDS = {
  appearance: [
    {
      max: 50,
      label: "普通外貌，不形成显著命运优势",
      multiplier: 0.85,
      monetizable: false,
    },
    {
      max: 60,
      label: "略有亲和力，桃花与初见印象小幅提升",
      multiplier: 1.12,
      monetizable: false,
    },
    {
      max: 70,
      label: "外貌出众，社交与桃花机会明显提升",
      multiplier: 1.45,
      monetizable: false,
    },
    {
      max: 80,
      label: "高颜值，可显著影响曝光、恋爱和人脉",
      multiplier: 2.15,
      monetizable: true,
    },
    {
      max: 90,
      label: "稀缺外貌，具备稳定的形象商业价值",
      multiplier: 3.0,
      monetizable: true,
    },
    {
      max: 101,
      label: "顶级外貌，极少数场景可主要靠形象变现",
      multiplier: 4.2,
      monetizable: true,
    },
  ],
  athletic: [
    { max: 40, label: "体能偏弱，伤病与恢复风险上升", multiplier: 0.72 },
    { max: 55, label: "普通体能，对人生路径影响较小", multiplier: 1 },
    { max: 70, label: "体能良好，抗压与恢复能力提升", multiplier: 1.35 },
    { max: 85, label: "运动优势明显，可解锁竞技与户外机会", multiplier: 1.9 },
    { max: 101, label: "顶级运动天赋，具备专业化可能", multiplier: 2.8 },
  ],
  skill: [
    { max: 40, label: "技能基础薄弱，学习和就业选择受限", multiplier: 0.68 },
    { max: 55, label: "技能普通，主要依赖时间积累", multiplier: 1 },
    { max: 70, label: "学习能力较强，职业成长开始加速", multiplier: 1.4 },
    {
      max: 85,
      label: "专业能力突出，副业与跃迁概率显著提升",
      multiplier: 2.05,
    },
    { max: 101, label: "稀缺技能天赋，具备行业头部潜力", multiplier: 3.1 },
  ],
};

const traitEffect = (value) => {
  if (value < 30) return { level: "很低", multiplier: 0.72 };
  if (value < 50) return { level: "偏低", multiplier: 0.9 };
  if (value < 65) return { level: "中等", multiplier: 1.05 };
  if (value < 80) return { level: "较高", multiplier: 1.35 };
  if (value < 90) return { level: "很高", multiplier: 1.75 };
  return { level: "极端", multiplier: 2.25 };
};

export function buildAbilityModel(settings, state) {
  const appearance = band(settings.talents?.颜值 ?? 50, SCORE_BANDS.appearance);
  const athletic = band(settings.talents?.运动 ?? 50, SCORE_BANDS.athletic);
  const skill = band(settings.talents?.技能 ?? 50, SCORE_BANDS.skill);
  const traits = Object.fromEntries(
    Object.entries(settings.traits || {}).map(([name, value]) => [
      name,
      { score: value, ...traitEffect(value) },
    ]),
  );
  return {
    appearance: { score: settings.talents?.颜值 ?? 50, ...appearance },
    athletic: { score: settings.talents?.运动 ?? 50, ...athletic },
    skill: { score: settings.talents?.技能 ?? 50, ...skill },
    traits,
    condition: {
      healthMultiplier:
        state.health < 35
          ? 0.45
          : state.health < 60
            ? 0.78
            : state.health > 85
              ? 1.18
              : 1,
      moodMultiplier:
        state.mood < 30
          ? 0.6
          : state.mood < 55
            ? 0.86
            : state.mood > 85
              ? 1.2
              : 1,
      careerMultiplier:
        state.career < 40
          ? 0.85
          : state.career < 70
            ? 1.1
            : state.career < 90
              ? 1.45
              : 1.8,
    },
  };
}

export function buildRandomEventField(settings, state, turn) {
  const model = buildAbilityModel(settings, state);
  const adventure = model.traits.冒险?.multiplier || 1;
  const curiosity = model.traits.好奇?.multiplier || 1;
  const exposure = /旅行|户外|骑行|驾驶|夜班|加班|创业/.test(
    `${turn?.title || ""}${turn?.decision || ""}`,
  )
    ? 1.8
    : 1;
  const risks = {
    opportunity: riskScore(turn, /职业|升职|跃迁|就业|机会/, 18),
    relationship: riskScore(turn, /关系|婚恋|家庭|背叛|社交/, 12),
    financial: riskScore(turn, /财务|债务|破产|失业|经济/, 8),
    health: riskScore(turn, /健康|疾病|伤病|事故/, 14),
    twist: riskScore(turn, /意外|转折|变化/, 20),
  };
  const definitions = [
    {
      key: "ordinaryTwist",
      label: "日常意外转折",
      valence: "mixed",
      probability: 0.08 * curiosity * riskMultiplier(risks.twist),
    },
    {
      key: "unexpectedOpportunity",
      label: "突发机会或贵人",
      valence: "favorable",
      probability:
        0.012 *
        model.skill.multiplier *
        curiosity *
        riskMultiplier(risks.opportunity),
    },
    {
      key: "relationshipShock",
      label: "关系网络突发变化",
      valence: "mixed",
      probability: 0.02 * riskMultiplier(risks.relationship),
    },
    {
      key: "financialShock",
      label: "意外财务冲击",
      valence: "adverse",
      probability:
        0.018 * (0.8 + adventure * 0.25) * riskMultiplier(risks.financial),
    },
    {
      key: "fraudOrTrap",
      label: "骗局、误导或灰色诱惑",
      valence: "adverse",
      probability: 0.009 * adventure * riskMultiplier(risks.financial),
    },
    {
      key: "healthIncident",
      label: "突发健康事件",
      valence: "adverse",
      probability:
        (0.014 * exposure * riskMultiplier(risks.health)) /
        Math.max(0.55, model.athletic.multiplier),
    },
    {
      key: "viralExposure",
      label: "作品突然传播或走红",
      valence: "favorable",
      probability:
        0.00035 *
        model.skill.multiplier *
        model.appearance.multiplier *
        riskMultiplier(risks.opportunity),
    },
    {
      key: "jackpot",
      label: "彩票或纯运气横财",
      valence: "favorable",
      probability: state.cash >= 2 ? 0.0001 : 0,
    },
    {
      key: "seriousAccident",
      label: "严重交通或户外事故",
      valence: "adverse",
      probability:
        (0.00015 * exposure * riskMultiplier(risks.health)) /
        Math.max(0.7, model.athletic.multiplier),
    },
  ];
  return definitions.map((event) => {
    const probability = clamp(
      event.probability,
      0,
      event.key === "ordinaryTwist" ? 0.22 : 0.07,
    );
    const roll = Math.random();
    return {
      ...event,
      inheritedRisk:
        risks[
          event.key === "unexpectedOpportunity" || event.key === "viralExposure"
            ? "opportunity"
            : event.key === "relationshipShock"
              ? "relationship"
              : event.key === "ordinaryTwist"
                ? "twist"
                : event.key === "healthIncident" ||
                    event.key === "seriousAccident"
                  ? "health"
                  : "financial"
        ],
      probability,
      roll,
      triggered: roll < probability,
    };
  });
}

export function buildTurnOutcomeField(settings, state, turn) {
  const model = buildAbilityModel(settings, state);
  const risks = {
    opportunity: riskScore(turn, /职业|升职|跃迁|就业|机会/, 18),
    relationship: riskScore(turn, /关系|婚恋|家庭|背叛|社交/, 12),
    financial: riskScore(turn, /财务|债务|破产|失业|经济/, 8),
    health: riskScore(turn, /健康|疾病|伤病|事故/, 14),
  };
  const resources = Math.max(
    1,
    Number(state.cash || 0) +
      Object.values(state.assets || {}).reduce(
        (sum, value) => sum + (Number(value) || 0),
        0,
      ),
  );
  const debtPressure = Math.min(0.18, Number(state.debt || 0) / resources / 8);
  const lowCondition =
    (state.health < 55 ? (55 - state.health) / 180 : 0) +
    (state.mood < 50 ? (50 - state.mood) / 220 : 0);
  const favorableWeight =
    0.22 +
    risks.opportunity / 400 +
    Math.max(0, model.skill.multiplier - 1) * 0.025;
  const adverseWeight =
    0.22 +
    (risks.financial + risks.health + risks.relationship) / 500 +
    debtPressure +
    lowCondition;
  const weights = {
    favorable: favorableWeight,
    mixed: 0.34,
    adverse: adverseWeight,
    stagnant: 0.28,
  };
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
  const probabilities = Object.fromEntries(
    Object.entries(weights).map(([key, value]) => [key, value / total]),
  );
  const roll = Math.random();
  let cursor = 0;
  let direction = "stagnant";
  for (const key of ["favorable", "mixed", "adverse", "stagnant"]) {
    cursor += probabilities[key];
    if (roll < cursor) {
      direction = key;
      break;
    }
  }
  const directives = {
    favorable:
      "本轮允许取得实质进展，但成功必须来自条件、行动与运气的共同作用；仍可伴随成本，禁止无代价跃迁。",
    mixed:
      "本轮必须同时存在实质收益与实质代价，不能把代价一句带过，也不能把失败完全包装成成长。",
    adverse:
      "本轮必须出现至少一项会延续到后续的实质损失或受挫；理性努力可以减轻损失，但不得把结果反转成净成功。",
    stagnant:
      "本轮没有关键突破，允许平淡、维持、等待、重复劳动或尝试未果；数值应大多为0或轻微波动。",
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
    inheritedRisks: risks,
    roll,
  };
}

const probabilityForTurn = (annualProbability, monthsPerTurn) =>
  1 - Math.pow(1 - clamp(annualProbability, 0, 0.95), monthsPerTurn / 12);

export function buildLifeStageField(
  settings,
  state,
  age,
  monthsPerTurn = 6,
  logs = [],
) {
  const model = buildAbilityModel(settings, state);
  const traits = settings.traits || {};
  const recentText = logs
    .slice(-4)
    .map((item) => `${item.title || ""}${item.tag || ""}${item.decision || ""}`)
    .join(" ");
  const adaptations = (settings.personalityProfile?.adaptations || [])
    .map((item) => `${item.key || ""}${item.dimension || ""}`)
    .join(" ");
  const adventure = model.traits.冒险?.multiplier || 1;
  const curiosity = model.traits.好奇?.multiplier || 1;
  const family = model.traits.家庭?.multiplier || 1;
  const romanticCaution = /romanticCaution|intimacy|socialCaution/.test(
    adaptations,
  )
    ? 0.72
    : 1;
  const repeatPenalty = (pattern) => (pattern.test(recentText) ? 0.28 : 1);
  let stage = "成年生活";
  let definitions = [];

  if (age < 6) {
    stage = "婴幼儿依恋与探索";
    definitions = [
      [
        "caregiverBond",
        "照护关系变化",
        0.62,
        "依恋、安全感与照护者状态主导反应",
      ],
      [
        "earlyExploration",
        "感官探索与早期兴趣",
        0.52,
        "好奇和身体发展比理性计划更重要",
      ],
      [
        "earlyAdversity",
        "早期照护创伤或重大分离",
        0.12,
        "照护忽视、家庭暴力、重大疾病、事故或重要照护者离开都可能影响安全感",
      ],
    ];
  } else if (age < 12) {
    stage = "儿童同伴与兴趣形成";
    definitions = [
      [
        "peerBelonging",
        "同伴接纳或冲突",
        0.58,
        "归属感、模仿和即时情绪会影响选择",
      ],
      [
        "interestFormation",
        "兴趣尝试与放弃",
        0.48 * curiosity,
        "允许三分钟热度、受挫或因同伴改变兴趣",
      ],
      [
        "childhoodAdversity",
        "童年创伤或边界受损",
        0.16,
        "允许出现霸凌、忽视、家暴、丧失、控制或侵害，并真实影响信任和自我保护",
      ],
    ];
  } else if (age < 18) {
    stage = "青春期情感与身份探索";
    definitions = [
      [
        "adolescentRomance",
        "暗恋、暧昧、表白、恋爱或失恋",
        0.68 * romanticCaution * repeatPenalty(/暗恋|暧昧|表白|恋爱|分手|失恋/),
        "情感萌动概率较高；内向或戒备可能表现为暗恋、回避或错失，而非没有情感",
      ],
      [
        "peerIdentity",
        "同伴认同与自我形象",
        0.6,
        "同伴评价、冲动和自尊可以压过成本收益计算",
      ],
      [
        "familyIndependence",
        "与家庭争取边界",
        0.42 * Math.max(0.45, 2.1 - family),
        "允许顶嘴、隐瞒、妥协或事后后悔",
      ],
      [
        "adolescentAdversity",
        "青春期创伤与安全危机",
        0.14,
        "霸凌、家庭暴力、控制、诱骗、侵害或重大丧失可能改变安全感与亲密边界",
      ],
    ];
  } else if (age < 26) {
    stage = "青年独立与亲密关系";
    definitions = [
      [
        "youngAdultRomance",
        "恋爱与亲密关系推进",
        0.56 * romanticCaution * repeatPenalty(/恋爱|暧昧|表白|分手|同居/),
        "亲密需求与个人边界共同作用",
      ],
      [
        "educationCareer",
        "升学、求职或方向摇摆",
        0.62 * repeatPenalty(/升学|求职|入职|转行/),
        "允许理想、虚荣、焦虑和现实压力同时影响决定",
      ],
      [
        "independentLife",
        "离家与独立生活",
        0.4,
        "家庭依赖和自由冲动可能发生冲突",
      ],
    ];
  } else if (age < 36) {
    stage = "成年早期的关系与事业建立";
    definitions = [
      [
        "partnership",
        "长期关系、婚育或不婚选择",
        0.44 * repeatPenalty(/结婚|婚育|生育|不婚|分手|离婚/),
        "社会期待只是压力，不是必选答案",
      ],
      [
        "careerMobility",
        "职业跃迁、转行或停滞",
        0.5 * repeatPenalty(/升职|转行|离职|失业/),
        "野心、安全感和既往成败共同影响选择",
      ],
      [
        "earlyEntrepreneurship",
        "创业、副业或独立执业机会",
        0.2 *
          (0.75 + adventure * 0.35 + curiosity * 0.15) *
          repeatPenalty(/创业|副业|开店|公司/),
        "机会出现不代表一定接受或成功",
      ],
    ];
  } else if (age < 51) {
    stage = "中年责任、创业与再选择";
    definitions = [
      [
        "midlifeEntrepreneurship",
        "创业、副业扩张或独立经营",
        0.32 *
          (0.72 + adventure * 0.38 + curiosity * 0.12) *
          repeatPenalty(/创业|副业|开店|公司|独立经营/),
        "中年接触创业和经营选择的概率较高，但家庭责任、失败记忆和风险偏好决定是否行动",
      ],
      [
        "careerReorientation",
        "职业瓶颈与重新定位",
        0.46 * repeatPenalty(/转行|离职|失业|瓶颈|创业/),
        "可能冒险、忍耐、逃避或维持现状",
      ],
      [
        "familyResponsibility",
        "育儿、伴侣或父母照护压力",
        0.48,
        "责任感可能压过个人收益，也可能引发逃避和冲突",
      ],
    ];
  } else if (age < 66) {
    stage = "成熟期照护与第二曲线";
    definitions = [
      [
        "secondCareer",
        "第二职业、返聘或小型经营",
        0.3 * repeatPenalty(/返聘|创业|经营|第二职业/),
        "经验、自尊、体力和安全需求共同决定",
      ],
      [
        "familyCare",
        "照护伴侣、父母或成年子女",
        0.46,
        "亲情与疲惫可能同时存在",
      ],
      [
        "healthAdjustment",
        "健康限制迫使生活调整",
        0.34 / Math.max(0.7, model.athletic.multiplier),
        "身体条件可以否决原本理性的计划",
      ],
    ];
  } else {
    stage = "晚年健康、陪伴与意义";
    definitions = [
      [
        "retirementIdentity",
        "退休身份与生活意义调整",
        0.46 * repeatPenalty(/退休|返聘|养老/),
        "习惯、失落、尊严和兴趣共同影响选择",
      ],
      [
        "companionship",
        "陪伴、丧失或关系重建",
        0.4 * romanticCaution,
        "亲密需求不会因年龄消失",
      ],
      [
        "lateLifeHealth",
        "健康与照护决策",
        0.58 / Math.max(0.7, model.athletic.multiplier),
        "身体限制与自主尊严需要同时考虑",
      ],
    ];
  }

  return {
    age,
    stage,
    exposureNotOutcome: true,
    events: definitions.map(([key, label, annualProbability, guidance]) => {
      const probability = probabilityForTurn(annualProbability, monthsPerTurn);
      const roll = Math.random();
      return {
        key,
        label,
        guidance,
        annualProbability: clamp(annualProbability, 0, 0.9),
        probability,
        roll,
        triggered: roll < probability,
      };
    }),
    traitContext: {
      理性: Number(traits.理性 ?? 50),
      冒险: Number(traits.冒险 ?? 50),
      家庭: Number(traits.家庭 ?? 50),
      好奇: Number(traits.好奇 ?? 50),
    },
  };
}

const CURRENCIES = [
  {
    test: /日本|东京|大阪|京都|日元/,
    code: "JPY",
    symbol: "¥",
    unit: "日元",
    fromCny: 20.5,
    locale: "ja-JP",
  },
  {
    test: /美国|纽约|旧金山|洛杉矶|美元/,
    code: "USD",
    symbol: "$",
    unit: "美元",
    fromCny: 0.14,
    locale: "en-US",
  },
  {
    test: /韩国|首尔|韩元/,
    code: "KRW",
    symbol: "₩",
    unit: "韩元",
    fromCny: 191,
    locale: "ko-KR",
  },
  {
    test: /新加坡|新币/,
    code: "SGD",
    symbol: "S$",
    unit: "新元",
    fromCny: 0.19,
    locale: "en-SG",
  },
];

export function currencyForWorld(world = "") {
  return (
    CURRENCIES.find((item) => item.test.test(world)) || {
      code: "CNY",
      symbol: "¥",
      unit: "人民币",
      fromCny: 1,
      locale: "zh-CN",
    }
  );
}

export function formatWorldMoney(value, world, options = {}) {
  const currency = currencyForWorld(world);
  const converted = (Number(value) || 0) * currency.fromCny;
  const maximumFractionDigits =
    currency.code === "JPY" || currency.code === "KRW" ? 0 : 2;
  const amount = new Intl.NumberFormat(currency.locale, {
    maximumFractionDigits,
  }).format(converted);
  return options.withUnit
    ? `${currency.symbol}${amount} ${currency.unit}`
    : `${currency.symbol}${amount}`;
}
