import { recordEventSignature, signatureFromResult } from "./topicLedger.js";

const asArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const clamp = (value, min = 0, max = 100) =>
  Math.max(min, Math.min(max, Number(value) || 0));

const seedWorldProcesses = (world = "") => {
  const clauses = String(world)
    .split(/[。；;]/)
    .map((item) => item.trim())
    .filter(Boolean);
  return clauses.slice(1, 6).map((summary, index) => ({
    id: `world_seed_${index}`,
    scope: "背景环境",
    summary: summary.slice(0, 120),
    affectedGroups: [],
    channels: [],
    intensity: 30,
    status: "background",
    lastChangedTurn: 0,
  }));
};

const routineProcess = ({ resume = {}, month = 0 }) => ({
  id: "current_routine",
  kind: "routine",
  status: "active",
  participants: ["主角"],
  location: resume.organization || "当前生活圈",
  pressure: 28,
  momentum: 45,
  unresolvedQuestion: `${resume.currentRole || "当前生活"}会如何自然继续`,
  createdAtTurn: Math.floor(month / 6),
  lastAdvancedTurn: Math.floor(month / 6),
});

export function createInitialSimulationState(context = {}) {
  const { relations = [], resume = {}, month = 0 } = context;
  return {
    version: 1,
    processes: [routineProcess({ resume, month })],
    worldProcesses: seedWorldProcesses(context.settings?.world),
    npcAgendas: Object.fromEntries(
      relations.map((relation) => [
        relation.name,
        {
          currentGoal: "维持自己的日常生活",
          currentPressure: 20,
          emotionalState: "平稳",
          contactLikelihood: /父亲|母亲/.test(relation.name) ? 0.45 : 0.3,
          activeConcerns: [],
          unresolvedIssuesWithProtagonist: [],
          lastContactTurn: -1,
          turnsSinceConflict: 99,
        },
      ]),
    ),
    commitments: [],
    openLoops: [],
    topicLedger: [],
    causalFacts: [],
    lastTrace: null,
  };
}

export function normalizeSimulationState(raw, context = {}) {
  const fallback = createInitialSimulationState(context);
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    ...fallback,
    ...source,
    version: 1,
    processes: asArray(source.processes).length
      ? asArray(source.processes).slice(-20)
      : fallback.processes,
    worldProcesses: asArray(source.worldProcesses).length
      ? asArray(source.worldProcesses).slice(-12)
      : fallback.worldProcesses,
    npcAgendas: { ...fallback.npcAgendas, ...(source.npcAgendas || {}) },
    commitments: asArray(source.commitments).slice(-20),
    openLoops: asArray(source.openLoops).slice(-20),
    topicLedger: asArray(source.topicLedger).slice(-40),
    causalFacts: asArray(source.causalFacts).slice(-50),
  };
}

const updateNpcAgendas = (agendas, result, turn) => {
  const next = { ...agendas };
  for (const change of result.relationshipChanges || []) {
    if (!change?.name || next[change.name]) continue;
    next[change.name] = {
      currentGoal: "继续自己的生活并理解这段新关系",
      currentPressure: 20,
      emotionalState: "平稳",
      contactLikelihood: 0.3,
      activeConcerns: [],
      unresolvedIssuesWithProtagonist: [],
      lastContactTurn: turn,
      turnsSinceConflict: 99,
    };
  }
  const changedNames = new Set(
    (result.relationshipChanges || []).map((item) => item.name),
  );
  for (const [name, agenda] of Object.entries(next)) {
    const change = (result.relationshipChanges || []).find(
      (item) => item.name === name,
    );
    const conflict = ["冲突", "恶化", "决裂", "背叛"].includes(
      change?.eventType,
    );
    const repaired = change?.eventType === "修复";
    next[name] = {
      ...agenda,
      currentPressure: clamp(
        Number(agenda.currentPressure || 0) +
          (conflict ? 16 : repaired ? -12 : -2),
      ),
      lastContactTurn: changedNames.has(name) ? turn : agenda.lastContactTurn,
      turnsSinceConflict: conflict
        ? 0
        : Number(agenda.turnsSinceConflict ?? 99) + 1,
      unresolvedIssuesWithProtagonist: conflict
        ? [
            ...asArray(agenda.unresolvedIssuesWithProtagonist),
            String(
              change?.memory || change?.action || result.title || "未解决分歧",
            ).slice(0, 90),
          ].slice(-4)
        : repaired
          ? asArray(agenda.unresolvedIssuesWithProtagonist).slice(1)
          : asArray(agenda.unresolvedIssuesWithProtagonist),
    };
  }
  return next;
};

const updateProcesses = (processes, result, turn) => {
  const selected = result.emergentEvent;
  const continuedId = selected?.continuationOf;
  const next = processes.map((process) => ({
    ...process,
    pressure: clamp(Number(process.pressure || 0) - 3),
    momentum: clamp(Number(process.momentum || 0) - 2),
    lastAdvancedTurn:
      continuedId && process.id === continuedId
        ? turn
        : process.lastAdvancedTurn,
  }));
  if (!selected?.processUpdate?.id) return next.slice(-20);
  const update = selected.processUpdate;
  const index = next.findIndex((process) => process.id === update.id);
  const normalized = {
    id: String(update.id).slice(0, 60),
    kind: String(update.kind || "life").slice(0, 30),
    status: update.status || "active",
    participants: asArray(update.participants).slice(0, 5),
    location: String(update.location || "当前生活圈").slice(0, 60),
    pressure: clamp(update.pressure ?? 35),
    momentum: clamp(update.momentum ?? 40),
    unresolvedQuestion: String(
      update.unresolvedQuestion || selected.dramaticQuestion || "后续仍未确定",
    ).slice(0, 100),
    createdAtTurn: index >= 0 ? next[index].createdAtTurn : turn,
    lastAdvancedTurn: turn,
  };
  if (index >= 0) next[index] = { ...next[index], ...normalized };
  else next.push(normalized);
  return next.slice(-20);
};

export function advanceSimulationState(raw, result = {}, context = {}) {
  const current = normalizeSimulationState(raw, context);
  const turn = Number(
    context.turnNumber ?? Math.floor((context.month || 0) / 6),
  );
  const signature =
    result.emergentEvent?.signature || signatureFromResult(result);
  const worldUpdates = (result.worldEvents || []).map((event, index) => ({
    id: event.id || `world_turn_${turn}_${index}`,
    scope: event.scope || "当前地区",
    summary: String(
      event.description || event.title || "世界状态发生变化",
    ).slice(0, 140),
    affectedGroups: Array.isArray(event.affectedGroups)
      ? event.affectedGroups.slice(0, 5)
      : [],
    channels: Object.entries(event.effects || {})
      .filter(([, value]) => Number(value) > 0)
      .map(([key]) => key)
      .slice(0, 5),
    intensity: clamp(event.intensity || 30),
    status: event.status || "ongoing",
    lastChangedTurn: turn,
  }));
  const worldMap = new Map(
    [...current.worldProcesses, ...worldUpdates].map((process) => [
      process.id,
      process,
    ]),
  );
  return {
    ...current,
    processes: updateProcesses(current.processes, result, turn),
    worldProcesses: [...worldMap.values()]
      .filter((process) => process.status !== "resolved")
      .slice(-12),
    npcAgendas: updateNpcAgendas(current.npcAgendas, result, turn),
    topicLedger: recordEventSignature(
      current.topicLedger,
      signature,
      turn,
      result.emergentEvent?.continuationOf || null,
    ),
    causalFacts: [
      ...current.causalFacts,
      {
        id: `turn-${turn}`,
        fact: String(result.log || result.title || "本轮生活继续").slice(
          0,
          140,
        ),
        turn,
      },
    ].slice(-50),
    lastTrace: result.simulationTrace || null,
  };
}

export function migrateGameSave(save = {}) {
  const simulation = normalizeSimulationState(save.simulation, {
    settings: save.settings,
    relations: save.relations,
    resume: save.resume,
    logs: save.logs,
    month: save.month,
  });
  return {
    ...save,
    version: 8,
    simulation,
    history: asArray(save.history).map((snapshot) => ({
      ...snapshot,
      version: 8,
      simulation: normalizeSimulationState(snapshot.simulation, {
        settings: snapshot.settings,
        relations: snapshot.relations,
        resume: snapshot.resume,
        logs: snapshot.logs,
        month: snapshot.month,
      }),
    })),
  };
}
