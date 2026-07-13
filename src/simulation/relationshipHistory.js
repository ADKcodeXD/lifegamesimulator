import {
  BETRAYAL_PATTERN,
  RELATION_EVENT_THRESHOLDS,
  REPAIR_PATTERN,
  RUPTURE_PATTERN,
} from "../data/relationshipHistoryConfig.ts";

const number = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
};

const eventId = (name, age, kind, index) =>
  `${name}-${age}-${kind}-${index}-${Date.now()}`;

function initialInteraction(profile, relation, settings) {
  const isFamily = /父亲|母亲|父母|兄弟|姐妹|家人/.test(
    `${profile?.relationToProtagonist || ""}${relation?.name || ""}`,
  );
  const age = isFamily ? 0 : number(profile?.createdAtAge, settings.startAge);
  return {
    id: `initial-${relation?.name || profile?.name || "npc"}`,
    age,
    kind: isFamily ? "family" : "met",
    title: isFamily
      ? `${relation?.name || profile?.name}与主角成为家人`
      : `${relation?.name || profile?.name}进入主角的生活`,
    detail: isFamily
      ? "从主角出生起，这段关系便成为人生背景的一部分。"
      : "旧存档没有更早的逐次记录，从现有关系状态开始追踪。",
    delta: 0,
    valueAfter: number(relation?.value, 50),
    status: relation?.status || profile?.relationToProtagonist || "关系建立",
  };
}

export function normalizeNpcInteractionHistories(
  npcProfiles = {},
  relations = [],
  settings = {},
) {
  const relationMap = new Map(relations.map((item) => [item.name, item]));
  return Object.fromEntries(
    Object.entries(npcProfiles).map(([name, profile]) => {
      const existing = Array.isArray(profile?.interactionHistory)
        ? profile.interactionHistory.filter(Boolean)
        : [];
      const personalityHistory = Array.isArray(profile?.personalityHistory)
        ? profile.personalityHistory.filter(Boolean).slice(-20)
        : profile?.personality
          ? [
              {
                id: `personality-initial-${name}`,
                age: number(profile.createdAtAge, settings.startAge),
                summary: profile.personality,
                evidence: "初始人物档案",
              },
            ]
          : [];
      const relation = relationMap.get(name) || { name, value: 50 };
      return [
        name,
        {
          ...profile,
          interactionHistory: existing.length
            ? existing.slice(-RELATION_EVENT_THRESHOLDS.maximumPerNpc)
            : [initialInteraction(profile, relation, settings)],
          personalityHistory,
        },
      ];
    }),
  );
}

function classifyEvent(change, context, isNew, isHistorical) {
  const delta = number(change.delta);
  const suppliedKinds = {
    相识: "met",
    升温: "warming",
    靠近: "closer",
    冲突: "conflict",
    恶化: "deteriorated",
    决裂: "rupture",
    背叛: "betrayal",
    修复: "repaired",
    重逢: "reunion",
    日常: "interaction",
  };
  if (isHistorical) return "reunion";
  if (isNew) return "met";
  if (suppliedKinds[change.eventType]) return suppliedKinds[change.eventType];
  const text = `${change.status || ""} ${change.action || ""} ${change.memory || ""} ${context.title || ""} ${context.event || ""}`;
  if (BETRAYAL_PATTERN.test(text)) return "betrayal";
  if (RUPTURE_PATTERN.test(text)) return "rupture";
  if (REPAIR_PATTERN.test(text)) return "repaired";
  if (delta <= RELATION_EVENT_THRESHOLDS.deteriorated) return "deteriorated";
  if (delta <= RELATION_EVENT_THRESHOLDS.conflict) return "conflict";
  if (delta >= RELATION_EVENT_THRESHOLDS.warming) return "warming";
  if (delta >= RELATION_EVENT_THRESHOLDS.closer) return "closer";
  return "interaction";
}

function eventTitle(name, kind) {
  const titles = {
    met: `${name}与主角相识`,
    reunion: `${name}与主角重逢`,
    warming: `${name}与主角感情升温`,
    closer: `${name}与主角关系更近一步`,
    conflict: `${name}与主角产生隔阂`,
    deteriorated: `${name}与主角关系恶化`,
    rupture: `${name}与主角决裂`,
    betrayal: `${name}对主角造成信任伤害`,
    repaired: `${name}与主角开始修复关系`,
    interaction: `${name}与主角发生重要互动`,
  };
  return titles[kind] || titles.interaction;
}

export function recordProtagonistInteractions({
  npcProfiles,
  previousRelations = [],
  nextRelations = [],
  historicalContacts = [],
  changes = [],
  context = {},
}) {
  const profiles = { ...npcProfiles };
  const previousNames = new Set(previousRelations.map((item) => item.name));
  const historicalNames = new Set(historicalContacts.map((item) => item.name));
  const nextMap = new Map(nextRelations.map((item) => [item.name, item]));

  changes.forEach((change, index) => {
    if (!change?.name || !profiles[change.name]) return;
    const profile = profiles[change.name];
    const history = Array.isArray(profile.interactionHistory)
      ? profile.interactionHistory
      : [];
    const kind = classifyEvent(
      change,
      context,
      !previousNames.has(change.name),
      historicalNames.has(change.name),
    );
    const relation = nextMap.get(change.name);
    const event = {
      id: eventId(change.name, context.age, kind, index),
      age: number(context.age),
      kind,
      title: eventTitle(change.name, kind),
      detail:
        change.memory ||
        change.action ||
        context.summary ||
        context.event ||
        "这次互动改变了双方对彼此的理解。",
      delta: number(change.delta),
      valueAfter: number(relation?.value, profile.value || 50),
      status: change.status || relation?.status || "关系变化",
      sourceTitle: context.title || "人生事件",
    };
    const personalityChanged =
      change.personality && change.personality !== profile.personality;
    const personalityInsight =
      change.personalityInsight ||
      (personalityChanged
        ? `通过本次互动，对${change.name}的性格有了新认识。`
        : "");
    profiles[change.name] = {
      ...profile,
      personality: change.personality || profile.personality,
      interactionHistory: [...history, event].slice(
        -RELATION_EVENT_THRESHOLDS.maximumPerNpc,
      ),
      personalityHistory: personalityInsight
        ? [
            ...(profile.personalityHistory || []),
            {
              id: `npc-personality-${change.name}-${context.age}-${index}`,
              age: number(context.age),
              summary: change.personality || profile.personality,
              evidence: personalityInsight,
            },
          ].slice(-20)
        : profile.personalityHistory || [],
    };
  });

  return profiles;
}

export function recordArchivedInteractions(npcProfiles, archivedNow, age) {
  const profiles = { ...npcProfiles };
  archivedNow.forEach((contact, index) => {
    const profile = profiles[contact.name];
    if (!profile) return;
    const history = profile.interactionHistory || [];
    profiles[contact.name] = {
      ...profile,
      interactionHistory: [
        ...history,
        {
          id: eventId(contact.name, age, "faded", index),
          age: number(age),
          kind: "faded",
          title: `${contact.name}与主角逐渐淡出彼此生活`,
          detail: contact.archivedReason || "长期缺少互动，关系自然淡出。",
          delta: 0,
          valueAfter: number(contact.value),
          status: "历史联系人",
        },
      ].slice(-RELATION_EVENT_THRESHOLDS.maximumPerNpc),
    };
  });
  return profiles;
}
