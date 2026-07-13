const clamp = (value, min = 0, max = 100) =>
  Math.max(min, Math.min(max, value));

const startYearFor = (world = "") => {
  const match = String(world).match(/(?:19|20)\d{2}/);
  return match ? Number(match[0]) : 2026;
};

const regionFor = (world = "") => {
  if (/中国|北京|上海|深圳|成都|杭州|武汉|县城/.test(world)) return "中国";
  if (/美国|纽约|旧金山|硅谷|洛杉矶/.test(world)) return "美国";
  if (/日本|东京|大阪|京都/.test(world)) return "日本";
  if (/韩国|首尔/.test(world)) return "韩国";
  if (/新加坡/.test(world)) return "新加坡";
  return "全球化城市";
};

const phaseFor = (intensity) =>
  intensity >= 76 ? "剧烈冲击" : intensity >= 55 ? "深度调整" : "长期余波";

export function buildWorldState(settings = {}, month = 0) {
  const world = settings.world || "";
  const startYear = startYearFor(world);
  const absoluteMonth = startYear * 12 + Math.max(0, Number(month) || 0);
  const year = Math.floor(absoluteMonth / 12);
  const monthOfYear = (absoluteMonth % 12) + 1;
  const region = regionFor(world);
  const events = [];

  if (year >= 2022) {
    const intensity = clamp(82 - (year - 2022) * 6, 32, 82);
    events.push({
      id: "europe-energy-shock",
      scope: "全球",
      title: "俄乌冲突重塑能源价格",
      phase: phaseFor(intensity),
      tone: "danger",
      intensity,
      description:
        "石油与天然气供应风险抬高能源价格，运输、化工、航空和制造成本随之上涨。",
      effects: {
        energyPrice: Math.round(intensity * 0.72),
        inflation: Math.round(intensity * 0.42),
        financialRisk: Math.round(intensity * 0.24),
      },
    });
  }

  if (year >= 2023) {
    const intensity = clamp(50 + (year - 2023) * 7, 50, 90);
    events.push({
      id: "ai-productivity-wave",
      scope: "全球",
      title: "AI生产力浪潮扩散",
      phase: intensity >= 75 ? "加速渗透" : "产业扩散",
      tone: "opportunity",
      intensity,
      description:
        "重复性知识工作被重新定价，算力、软件和复合型人才受益，初级岗位与传统流程承压。",
      effects: {
        careerOpportunity: Math.round(intensity * 0.5),
        jobDisplacement: Math.round(intensity * 0.36),
      },
    });
  }

  if (region === "中国" && year >= 2021) {
    const intensity = clamp(88 - (year - 2021) * 4, 48, 88);
    events.push({
      id: "china-property-downcycle",
      scope: "中国",
      title: "房地产下行周期",
      phase: phaseFor(intensity),
      tone: "warning",
      intensity,
      description:
        "销售、土地财政和房企信用收缩，住宅不再默认升值，建筑链就业与家庭财富效应走弱。",
      effects: {
        housingPressure: intensity,
        employmentPressure: Math.round(intensity * 0.38),
        consumerConfidence: -Math.round(intensity * 0.32),
      },
    });
  }

  if (region === "美国" && year >= 2022) {
    const intensity = clamp(76 - (year - 2022) * 5, 34, 76);
    events.push({
      id: "us-high-rate-cycle",
      scope: "美国",
      title: "高利率与融资重估",
      phase: phaseFor(intensity),
      tone: "warning",
      intensity,
      description:
        "住房按揭、创业融资和企业扩张成本偏高，现金流质量比增长故事更受重视。",
      effects: { creditCost: intensity, housingPressure: Math.round(intensity * 0.55) },
    });
  }

  if (region === "日本" && year >= 2023) {
    events.push({
      id: "japan-price-wage-reset",
      scope: "日本",
      title: "物价与工资体系重估",
      phase: "缓慢再平衡",
      tone: "warning",
      intensity: 55,
      description:
        "长期低通胀惯性松动，生活成本和工资谈判同时上升，日元波动影响进口消费。",
      effects: { inflation: 42, currencyVolatility: 58 },
    });
  }

  if (region === "韩国" && year >= 2022) {
    events.push({
      id: "korea-debt-chip-cycle",
      scope: "韩国",
      title: "家庭债务与半导体周期共振",
      phase: "高波动",
      tone: "warning",
      intensity: 63,
      description:
        "高家庭杠杆压缩消费，半导体景气又周期性抬升就业与出口，机会和压力并存。",
      effects: { creditCost: 62, careerOpportunity: 45, financialRisk: 48 },
    });
  }

  if (region === "新加坡" && year >= 2022) {
    events.push({
      id: "singapore-trade-cost-cycle",
      scope: "新加坡",
      title: "全球贸易波动与高生活成本",
      phase: "外部敏感期",
      tone: "warning",
      intensity: 58,
      description:
        "贸易与资金流带来高薪机会，也通过住房、食品和服务价格传导生活成本压力。",
      effects: { inflation: 45, careerOpportunity: 44, housingPressure: 52 },
    });
  }

  const effectValues = (key) =>
    events.map((event) => Number(event.effects?.[key]) || 0);
  const maxEffect = (key, fallback = 0) =>
    Math.max(fallback, ...effectValues(key));
  const energyPressure = maxEffect("energyPrice", 18);
  const housingPressure = maxEffect("housingPressure", 24);
  const inflationPressure = maxEffect("inflation", 28);
  const employmentPressure = Math.max(
    maxEffect("employmentPressure"),
    maxEffect("jobDisplacement"),
  );
  const opportunity = maxEffect("careerOpportunity", 26);
  const financialRisk = Math.max(
    maxEffect("financialRisk"),
    Math.round(housingPressure * 0.42),
  );
  const pressure = Math.round(
    energyPressure * 0.24 +
      housingPressure * 0.28 +
      inflationPressure * 0.2 +
      employmentPressure * 0.28,
  );

  return {
    date: { year, month: monthOfYear, label: `${year}年${monthOfYear}月` },
    region,
    climate:
      pressure >= 58 ? "逆风与结构性机会并存" : pressure >= 40 ? "高波动调整期" : "温和变化期",
    summary: events.length
      ? `${region}正处于${pressure >= 50 ? "成本、资产与就业重新定价" : "产业结构缓慢换挡"}阶段。${events
          .slice(0, 2)
          .map((event) => event.title)
          .join("，")}正在改变普通人的工作、消费与资产选择。`
      : `${region}暂未命中预设的重大宏观冲击，生活主要受当地产业、家庭资源与个人选择推动。`,
    indicators: [
      { key: "energy", label: "能源压力", value: energyPressure },
      { key: "housing", label: "住房压力", value: housingPressure },
      { key: "jobs", label: "就业重构", value: employmentPressure },
      { key: "opportunity", label: "新产业机会", value: opportunity },
    ],
    events,
    modifiers: {
      financialShock: 1 + financialRisk / 180 + energyPressure / 360,
      adverseWeight: clamp((pressure - 32) / 260, 0, 0.16),
      opportunityWeight: clamp(opportunity / 900, 0, 0.1),
      housingPressure,
      energyPressure,
    },
  };
}
