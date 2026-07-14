import { describeAbilityScore } from "./scoreCalibration.js";

const compact = (value, limit = 120) =>
  String(value || "")
    .trim()
    .slice(0, limit);

const recentInteractionTurn = (profile = {}) => {
  const latest = (profile.interactionHistory || []).at(-1);
  return Number(latest?.age || latest?.turn || -1);
};

const selectRelevantNpcs = ({
  relations = [],
  npcProfiles = {},
  simulation,
  age,
  random,
}) => {
  return relations
    .map((relation) => {
      const profile = npcProfiles[relation.name] || {};
      const agenda = simulation.npcAgendas?.[relation.name] || {};
      const unresolved = (agenda.unresolvedIssuesWithProtagonist || []).length;
      const isParent = /父亲|母亲/.test(relation.name);
      const ageDependence = isParent && age < 18 ? 45 : 0;
      const recent = recentInteractionTurn(profile) >= age - 1 ? 20 : 0;
      const contact = Number(agenda.contactLikelihood || 0.25) * 25;
      const activeIssue = unresolved ? 30 : 0;
      const relationWeight = Math.abs(Number(relation.value || 50) - 50) * 0.2;
      return {
        name: relation.name,
        relation,
        profile,
        agenda,
        score:
          ageDependence +
          recent +
          contact +
          activeIssue +
          relationWeight +
          random() * 12,
      };
    })
    .filter((item) => item.score >= 18)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ name, relation, profile, agenda }) => ({
      name,
      relationValue: Number(relation.value || 50),
      status: compact(relation.status, 40),
      role: compact(profile.role || relation.role, 50),
      personality: compact(profile.personality || relation.personality, 100),
      currentGoal: compact(agenda.currentGoal, 70),
      currentPressure: Number(agenda.currentPressure || 0),
      unresolvedIssues: (agenda.unresolvedIssuesWithProtagonist || []).slice(
        -2,
      ),
      turnsSinceConflict: Number(agenda.turnsSinceConflict ?? 99),
      recentInteractions: (profile.interactionHistory || [])
        .slice(-2)
        .map((item) => ({
          kind: item.kind,
          detail: compact(item.detail, 80),
        })),
    }));
};

export function buildActiveContext(payload, simulation, random = Math.random) {
  const { settings, state, resume = {}, logs = [], month = 0 } = payload;
  const age = (settings.startAge ?? 18) + Math.floor(month / 12);
  const relevantNpcs = selectRelevantNpcs({
    relations: payload.relations,
    npcProfiles: payload.npcProfiles,
    simulation,
    age,
    random,
  });
  const region = String(settings.world || "")
    .split(/[。；;]/)[0]
    .trim();
  const relevantWorldProcesses = simulation.worldProcesses
    .filter((process) => process.status !== "resolved")
    .filter(
      (process) =>
        process.status !== "background" ||
        random() < Math.min(0.55, 0.18 + Number(process.intensity || 0) / 180),
    )
    .sort((a, b) => Number(b.intensity || 0) - Number(a.intensity || 0))
    .slice(0, 2);
  const facts = [
    { id: "person.age", value: `${age}岁，${settings.gender}` },
    { id: "person.role", value: compact(resume.currentRole || "当前身份未定") },
    {
      id: "person.education",
      value: compact(resume.education || "教育状态未定"),
    },
    {
      id: "person.hobbies",
      value: compact(settings.bio?.hobbies || "没有明确爱好"),
    },
    {
      id: "person.background",
      value: compact(settings.bio?.childhood || "普通成长经历"),
    },
    {
      id: "person.personality",
      value: compact(settings.bio?.personality || "性格仍在形成"),
    },
    { id: "world.region", value: compact(region || "当前地区") },
    {
      id: "state.condition",
      value: `健康${state.health}，情绪${state.emotion ?? state.mood ?? 72}，事业状态${state.career}`,
    },
    ...simulation.processes
      .filter((process) => process.status === "active")
      .slice(0, 6)
      .map((process) => ({
        id: `process.${process.id}`,
        value: `${process.kind}；${process.unresolvedQuestion}；压力${process.pressure}`,
      })),
    ...relevantNpcs.map((npc) => ({
      id: `npc.${npc.name}`,
      value: `${npc.name}，${npc.status}，当前目标：${npc.currentGoal || "维持日常"}`,
    })),
    ...relevantWorldProcesses.map((process) => ({
      id: `world.${process.id}`,
      value: compact(
        `${process.scope || "环境"}：${process.summary || "正在变化"}`,
      ),
    })),
    ...(payload.approvalDecision
      ? [
          {
            id: "player.approval",
            value: compact(
              `${payload.approvalDecision.requestTitle || "玩家审批"}：${payload.approvalDecision.option?.label || "已批准"}，${payload.approvalDecision.option?.description || ""}`,
            ),
          },
        ]
      : []),
    ...(settings.directionPreferences?.selectedId
      ? [
          {
            id: "person.direction",
            value: compact(
              `人物近期倾向：${settings.directionPreferences.selectedId}`,
            ),
          },
        ]
      : []),
    ...logs.slice(-4).map((log, index) => ({
      id: `memory.${index}`,
      value: compact(
        `${log.title || ""}：${log.decision || log.text || log.summary || ""}`,
      ),
    })),
  ];
  return {
    date: { age, month, monthsPerTurn: settings.monthsPerTurn || 6 },
    protagonist: {
      gender: settings.gender,
      role: resume.currentRole,
      education: resume.education,
      personality: settings.bio?.personality,
      hobbies: settings.bio?.hobbies,
      traits: settings.traits,
      abilities: Object.fromEntries(
        Object.entries(settings.talents || {}).map(([name, value]) => {
          const score = describeAbilityScore(name, value);
          return [name, { score: score.score, level: score.level }];
        }),
      ),
      emotion: state.emotion ?? state.mood ?? 72,
      health: state.health,
    },
    facts,
    activeProcesses: simulation.processes
      .filter((process) => process.status === "active")
      .sort((a, b) => Number(b.pressure || 0) - Number(a.pressure || 0))
      .slice(0, 6),
    relevantNpcs,
    relevantWorldProcesses,
    commitments: simulation.commitments.slice(-6),
    openLoops: simulation.openLoops.slice(-6),
    recentSignatures: simulation.topicLedger.slice(-10),
  };
}
