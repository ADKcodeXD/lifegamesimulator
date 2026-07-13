import {
  NPC_LIFECYCLE_CONFIG,
  relationshipBandFor,
} from "../data/npcLifecycleConfig.ts";

const LEGACY_FIXED_CONTACT = "陈放";

const FAMILY_OR_PARTNER =
  /父亲|母亲|父母|家人|兄弟|姐妹|配偶|夫妻|妻子|丈夫|爱人|伴侣|子女|儿子|女儿/;

function isProtectedContact(relation, profile) {
  return FAMILY_OR_PARTNER.test(
    `${relation.name || ""} ${relation.status || ""} ${relation.relationToProtagonist || ""} ${profile?.relationToProtagonist || ""}`,
  );
}

function familiarityStatus(value) {
  return relationshipBandFor(value).label;
}

export function enrichNpcProfile(profile, protagonistAge, isNew = false) {
  return {
    ...profile,
    lifeStatus:
      profile.lifeStatus || (isNew ? "刚进入主角的生活圈" : "生活平稳"),
    statusSummary:
      profile.statusSummary || (isNew ? "等待后续互动" : "近期暂无显著变化"),
    createdAtAge: profile.createdAtAge ?? (isNew ? protagonistAge : undefined),
    lastUpdatedAge: profile.lastUpdatedAge ?? protagonistAge,
  };
}

export function removeLegacyFixedContact({
  relations = [],
  npcProfiles = {},
  socialEdges = [],
  historicalContacts = [],
}) {
  const profiles = { ...npcProfiles };
  delete profiles[LEGACY_FIXED_CONTACT];
  return {
    relations: relations.filter((item) => item.name !== LEGACY_FIXED_CONTACT),
    npcProfiles: profiles,
    socialEdges: socialEdges.filter(
      (edge) =>
        edge.source !== LEGACY_FIXED_CONTACT &&
        edge.target !== LEGACY_FIXED_CONTACT,
    ),
    historicalContacts: historicalContacts.filter(
      (item) => item.name !== LEGACY_FIXED_CONTACT,
    ),
  };
}

export function evolveNpcNetwork({
  relations,
  npcProfiles,
  socialEdges,
  historicalContacts = [],
  yearsPassed = 0,
  interactionNames = [],
  annualUpdates = [],
  protagonistAge,
  newContactNames = [],
}) {
  const interacted = new Set(interactionNames);
  const newContacts = new Set(newContactNames);
  const updates = new Map(
    annualUpdates.filter((item) => item?.name).map((item) => [item.name, item]),
  );
  const profiles = { ...npcProfiles };

  if (yearsPassed > 0) {
    for (const [name, profile] of Object.entries(profiles)) {
      const update = updates.get(name) || {};
      const shouldAge = !newContacts.has(name);
      profiles[name] = {
        ...profile,
        ...update,
        name,
        age: Math.max(
          0,
          Number(update.age ?? profile.age ?? 0) +
            (shouldAge ? yearsPassed : 0),
        ),
        role: update.role || profile.role,
        lifeStatus: update.lifeStatus || profile.lifeStatus || "生活平稳",
        statusSummary:
          update.summary || profile.statusSummary || "本年度暂无显著变化",
        lastUpdatedAge: protagonistAge,
      };
    }
  }

  const active = [];
  const archivedNow = [];
  for (const relation of relations) {
    const profile = profiles[relation.name];
    const protectedContact = isProtectedContact(relation, profile);
    const hadInteraction = interacted.has(relation.name);
    const inactiveYears = hadInteraction
      ? 0
      : Math.max(0, (relation.inactiveYears || 0) + yearsPassed);
    let value = relation.value;

    if (yearsPassed > 0 && !hadInteraction && !protectedContact) {
      const annualDecay = relationshipBandFor(value).annualDecay;
      value = Math.max(0, value - annualDecay * yearsPassed);
    }

    const shouldArchive =
      !protectedContact &&
      yearsPassed > 0 &&
      (value < NPC_LIFECYCLE_CONFIG.archiveBelowValue ||
        (inactiveYears >= NPC_LIFECYCLE_CONFIG.archiveAfterInactiveYears &&
          value < NPC_LIFECYCLE_CONFIG.archiveInactiveBelowValue));
    const nextRelation = {
      ...relation,
      age: profiles[relation.name]?.age ?? relation.age,
      value,
      inactiveYears,
      lastInteractionAge: hadInteraction
        ? protagonistAge
        : relation.lastInteractionAge,
      familiarity: familiarityStatus(value),
      lifeStatus: profiles[relation.name]?.lifeStatus || "生活平稳",
    };

    if (shouldArchive) {
      archivedNow.push({
        ...nextRelation,
        archivedAtAge: protagonistAge,
        archivedReason: "长期缺少互动，关系自然淡出",
        profile: profiles[relation.name] || null,
      });
    } else {
      active.push(nextRelation);
    }
  }

  const activeNames = new Set(active.map((item) => item.name));
  const archivedNames = new Set(archivedNow.map((item) => item.name));
  const historical = [
    ...historicalContacts.filter(
      (item) => !activeNames.has(item.name) && !archivedNames.has(item.name),
    ),
    ...archivedNow,
  ];
  const archivedNameSet = new Set(historical.map((item) => item.name));

  return {
    relations: active,
    npcProfiles: profiles,
    historicalContacts: historical,
    socialEdges: socialEdges.filter(
      (edge) =>
        !archivedNameSet.has(edge.source) && !archivedNameSet.has(edge.target),
    ),
    archivedNow,
  };
}
