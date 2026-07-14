import {
  buildLifeStageField,
  buildRandomEventField,
  buildTurnOutcomeField,
} from "./probabilityModel";

const EVENT_KEYS = [
  "ordinaryTwist",
  "unexpectedOpportunity",
  "relationshipShock",
  "financialShock",
  "fraudOrTrap",
  "healthIncident",
  "viralExposure",
  "jackpot",
  "seriousAccident",
];

export const PROBABILITY_TOOL = {
  type: "function",
  function: {
    name: "resolve_probability_field",
    description:
      "调用代码数学模型评估候选事件、执行固定随机抽样，并取得本轮不可篡改的结果方向。生成最终人生事件前必须调用一次。",
    parameters: {
      type: "object",
      properties: {
        candidateCategories: {
          type: "array",
          description: "本轮叙事可能涉及的事件类别，可多选。",
          items: { type: "string", enum: EVENT_KEYS },
          minItems: 1,
          maxItems: 5,
        },
        plannedAction: {
          type: "string",
          description: "人物基于人格与经历最可能采取的行动，60字以内。",
        },
      },
      required: ["candidateCategories", "plannedAction"],
    },
  },
};

export function createProbabilityToolRuntime(payload) {
  let audit = null;

  const sample = () => {
    if (audit) return audit;
    const age =
      (payload.settings.startAge ?? 18) + Math.floor(payload.month / 12);
    audit = {
      randomEvents: buildRandomEventField(
        payload.settings,
        payload.state,
        payload.turn,
        payload.month,
        payload.logs,
      ),
      outcome: buildTurnOutcomeField(
        payload.settings,
        payload.state,
        payload.turn,
        payload.month,
        payload.logs,
      ),
      lifeStage: buildLifeStageField(
        payload.settings,
        payload.state,
        age,
        payload.settings.monthsPerTurn || 6,
        payload.logs,
      ),
    };
    return audit;
  };

  const execute = (name, args = {}) => {
    if (name !== PROBABILITY_TOOL.function.name) {
      throw new Error(`未知概率工具：${name}`);
    }
    const resolved = sample();
    const requested = new Set(
      Array.isArray(args.candidateCategories)
        ? args.candidateCategories.filter((key) => EVENT_KEYS.includes(key))
        : [],
    );
    const visibleEvents = resolved.randomEvents.filter(
      (event) => requested.has(event.key) || event.triggered,
    );
    return {
      tool: name,
      plannedAction: String(args.plannedAction || "").slice(0, 80),
      evaluatedEvents: visibleEvents.map((event) => ({
        key: event.key,
        label: event.label,
        annualProbability: event.annualProbability,
        probability: event.probability,
        roll: event.roll,
        triggered: event.triggered,
        valence: event.valence,
      })),
      mandatoryTriggeredEvents: resolved.randomEvents
        .filter((event) => event.triggered)
        .map((event) => ({ key: event.key, label: event.label })),
      outcome: {
        direction: resolved.outcome.direction,
        label: resolved.outcome.label,
        directive: resolved.outcome.directive,
        probabilities: resolved.outcome.probabilities,
        inheritedRisks: resolved.outcome.inheritedRisks,
      },
      triggeredLifeStageEvents: resolved.lifeStage.events
        .filter((event) => event.triggered)
        .map((event) => ({ key: event.key, label: event.label })),
      rules: [
        "triggered=false的候选事件不得写成已经发生",
        "mandatoryTriggeredEvents非空时至少落实一项",
        "最终净结果必须服从outcome.direction与directive",
      ],
    };
  };

  return { execute, getAudit: sample };
}
