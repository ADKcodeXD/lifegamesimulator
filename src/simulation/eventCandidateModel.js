import { repetitionPenalty } from "./topicLedger.js";

export const ABILITY_KEYS = ["颜值", "运动", "智力", "天赋", "财商", "社交"];
export const DRIVE_KEYS = ["好奇", "安全", "家庭", "自主", "归属"];

const clamp = (value, min = 0, max = 1) =>
  Math.max(min, Math.min(max, Number(value) || 0));
const list = (value, limit = 8) =>
  (Array.isArray(value) ? value : []).filter(Boolean).slice(0, limit);
const compact = (value, limit = 120) =>
  String(value || "")
    .trim()
    .slice(0, limit);

const normalizeWeights = (weights = {}, allowed = ABILITY_KEYS) =>
  Object.fromEntries(
    Object.entries(weights)
      .filter(([key]) => allowed.includes(key))
      .map(([key, value]) => [key, clamp(value, -0.8, 0.8)]),
  );

export function normalizeCandidate(candidate = {}, index = 0) {
  const choices = list(candidate.choices, 4).map((choice, choiceIndex) => ({
    id: compact(choice.id || `choice_${choiceIndex}`, 40),
    action: compact(choice.action, 100),
    motivations: list(choice.motivations, 4).map((item) => compact(item, 50)),
    barriers: list(choice.barriers, 4).map((item) => compact(item, 50)),
    drives: normalizeWeights(choice.drives, DRIVE_KEYS),
    effort: clamp(choice.effort ?? 0.5),
  }));
  return {
    id: compact(candidate.id || `candidate_${index}`, 50),
    premise: compact(candidate.premise, 180),
    actors: list(candidate.actors, 5).map((item) => compact(item, 40)),
    location: compact(candidate.location, 60),
    sourceFactIds: list(candidate.sourceFactIds, 8).map((item) =>
      compact(item, 60),
    ),
    newFactsRequired: list(candidate.newFactsRequired, 4).map((item) =>
      compact(item, 100),
    ),
    newActorJustification: compact(candidate.newActorJustification, 100),
    continuationOf: candidate.continuationOf
      ? compact(candidate.continuationOf, 60)
      : null,
    triggerMechanism: compact(candidate.triggerMechanism, 100),
    dramaticQuestion: compact(candidate.dramaticQuestion, 120),
    choices,
    demands: {
      exposure: normalizeWeights(candidate.demands?.exposure),
      performance: normalizeWeights(candidate.demands?.performance),
      consequence: normalizeWeights(candidate.demands?.consequence),
    },
    difficulty: clamp(candidate.difficulty ?? 0.5),
    stakes: clamp(candidate.stakes ?? 0.35),
    signature: {
      actors: list(candidate.signature?.actors || candidate.actors, 5),
      setting: compact(candidate.signature?.setting || candidate.location, 70),
      mechanism: compact(
        candidate.signature?.mechanism || candidate.triggerMechanism,
        90,
      ),
      issue: compact(
        candidate.signature?.issue || candidate.dramaticQuestion,
        90,
      ),
      outcomeShape: "unresolved",
    },
    processUpdate: candidate.processUpdate || null,
  };
}

export function auditCandidate(candidate, context) {
  const factIds = new Set(context.facts.map((fact) => fact.id));
  const knownActors = new Set([
    "主角",
    ...context.relevantNpcs.map((npc) => npc.name),
  ]);
  const supportedFacts = candidate.sourceFactIds.filter((id) =>
    factIds.has(id),
  );
  const unknownActors = candidate.actors.filter(
    (actor) => !knownActors.has(actor),
  );
  const errors = [];
  if (!candidate.premise || !candidate.dramaticQuestion)
    errors.push("missing-premise");
  if (!candidate.choices.length) errors.push("missing-choices");
  if (!supportedFacts.length) errors.push("unsupported");
  if (unknownActors.length && !candidate.newActorJustification)
    errors.push("unintroduced-actor");
  if (
    candidate.continuationOf &&
    !context.activeProcesses.some(
      (item) => item.id === candidate.continuationOf,
    )
  ) {
    errors.push("unknown-continuation");
  }
  const conflictPattern = /冲突|争吵|反对|施压|干预|逼迫|指责|决裂/;
  const repeatsCoolingConflict = candidate.actors.some((actor) => {
    const npc = context.relevantNpcs.find((item) => item.name === actor);
    return (
      npc &&
      npc.turnsSinceConflict <= 1 &&
      conflictPattern.test(
        `${candidate.triggerMechanism}${candidate.dramaticQuestion}`,
      )
    );
  });
  if (repeatsCoolingConflict) errors.push("relationship-cooldown");
  return {
    valid: errors.length === 0,
    errors,
    supportedFacts,
    unknownActors,
    supportRatio: candidate.sourceFactIds.length
      ? supportedFacts.length / candidate.sourceFactIds.length
      : 0,
  };
}

export function scoreCandidate(candidate, context, simulation, turnNumber) {
  const audit = auditCandidate(candidate, context);
  const process = context.activeProcesses.find(
    (item) => item.id === candidate.continuationOf,
  );
  const repetition = repetitionPenalty(
    candidate.signature,
    simulation.topicLedger,
    turnNumber,
  );
  const support = audit.supportRatio;
  const continuity = process ? 1 : candidate.continuationOf ? 0 : 0.35;
  const urgency = process
    ? Number(process.pressure || 0) / 100
    : candidate.stakes * 0.45;
  const npcAgency = candidate.actors.some((actor) => actor !== "主角")
    ? 0.65
    : 0.25;
  const exposureEntries = Object.entries(candidate.demands?.exposure || {});
  const exposureWeight = exposureEntries.reduce(
    (sum, [, weight]) => sum + Math.abs(Number(weight || 0)),
    0,
  );
  const exposureFit = exposureWeight
    ? exposureEntries.reduce((sum, [name, weight]) => {
        const score = Number(
          context.protagonist.abilities?.[name]?.score ?? 50,
        );
        return sum + ((score - 50) / 15) * Number(weight || 0);
      }, 0) / exposureWeight
    : 0;
  const novelty = 1 - repetition;
  const unsupportedLeap = audit.errors.includes("unsupported")
    ? 1
    : audit.unknownActors.length
      ? 0.55
      : 0;
  const score =
    support * 2 +
    continuity * 1.4 +
    urgency * 1.2 +
    npcAgency * 0.8 +
    exposureFit * 0.32 +
    novelty * 0.8 -
    unsupportedLeap * 2.2 -
    repetition * 1.6 -
    audit.errors.length * 0.8;
  return {
    candidate,
    audit,
    score,
    repetition,
    novelty,
    continuity,
    urgency,
    exposureFit,
  };
}

export function selectCandidate(
  candidates,
  context,
  simulation,
  turnNumber,
  random = Math.random,
) {
  const scored = candidates
    .map((candidate, index) => normalizeCandidate(candidate, index))
    .map((candidate) =>
      scoreCandidate(candidate, context, simulation, turnNumber),
    );
  const valid = scored.filter((item) => item.audit.valid);
  const pool = valid.length ? valid : scored;
  if (!pool.length) return { selected: null, scored: [], rejected: [] };
  const temperature = 0.95;
  const weights = pool.map((item) => Math.exp(item.score / temperature));
  let roll = random() * weights.reduce((sum, value) => sum + value, 0);
  let selected = pool.at(-1);
  for (let index = 0; index < pool.length; index += 1) {
    roll -= weights[index];
    if (roll <= 0) {
      selected = pool[index];
      break;
    }
  }
  return {
    selected: selected.candidate,
    selectedScore: selected.score,
    scored: scored.map((item) => ({
      id: item.candidate.id,
      score: Number(item.score.toFixed(3)),
      repetition: Number(item.repetition.toFixed(3)),
      exposureFit: Number(item.exposureFit.toFixed(3)),
      valid: item.audit.valid,
      errors: item.audit.errors,
    })),
    rejected: scored
      .filter((item) => !item.audit.valid)
      .map((item) => item.candidate.id),
  };
}
