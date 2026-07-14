import {
  createFallbackNpcProfile,
  SIMULATION_CONFIG,
} from "../data/simulationTemplates";
import { blankTurn, clamp } from "../data/gameState";
import { applyFinancialTurn, calculateFinancialSummary } from "./financeModel";
import { reconcileSkillTurn } from "./skillModel";
import { enrichNpcProfile, evolveNpcNetwork } from "./npcLifecycle";
import {
  normalizeNpcInteractionHistories,
  recordArchivedInteractions,
  recordProtagonistInteractions,
} from "./relationshipHistory";
import { applyPersonalityTurn } from "./personalityModel";
import { consumeSelectedDirection } from "./directionModel";
import { evolveBodyProfile } from "./bodyModel";
import { buildMajorNotification, deriveDomainEvents } from "./domainEvents";
import { createGameSnapshot } from "./snapshot";

export function resolveTurn(current, result, approvalDecision = null) {
  const {
    settings,
    state,
    relations,
    logs,
    month,
    turn,
    resume,
    socialEdges,
    npcProfiles,
    historicalContacts,
  } = current;
  const age = (settings.startAge ?? 18) + Math.floor(month / 12);
  const monthOfYear = (month % 12) + 1;
  const skillTurn = reconcileSkillTurn(resume.skills, result);
  const delta = result.stateDelta || {};
  const turnMonths = settings.monthsPerTurn || 6;
  const nextMonth = month + turnMonths;
  const yearsPassed = Math.floor(nextMonth / 12) - Math.floor(month / 12);
  const nextAge = (settings.startAge ?? 18) + Math.floor(nextMonth / 12);
  const inactiveCareer = /失业|待业|空窗|Gap|停工|退休|休学/.test(
    `${result.statusLabel || ""} ${result.tag || ""} ${result.resumeUpdate?.employmentStatus || ""}`,
  );
  const stateDrift = {
    health:
      nextAge >= 55
        ? -yearsPassed * Math.max(1, Math.floor((nextAge - 45) / 30))
        : 0,
    career: inactiveCareer
      ? -Math.max(yearsPassed * 2, turnMonths >= 6 ? 1 : 0)
      : 0,
  };
  const financialTurn = applyFinancialTurn(state, result, {
    month,
    age,
    monthOfYear,
    monthsPerTurn: turnMonths,
    settings,
    resume,
    monthlyIncome: result.monthlyIncome ?? state.income ?? 0,
    time: `${age}岁 · ${monthOfYear}月`,
    title: result.title,
  });
  const nextState = {
    ...financialTurn.state,
    income: Math.max(0, result.monthlyIncome ?? state.income ?? 0),
    health: clamp(state.health + (delta.health || 0) + stateDrift.health),
    mood: clamp(state.mood + (delta.mood || 0)),
    career: clamp(state.career + (delta.career || 0) + stateDrift.career),
    bodyProfile: evolveBodyProfile(state.bodyProfile, settings, result, nextAge),
  };
  const nextSettings = {
    ...consumeSelectedDirection(settings),
    traits: Object.fromEntries(
      Object.entries(settings.traits).map(([key, value]) => [
        key,
        clamp(value + (result.traitDelta?.[key] || 0)),
      ]),
    ),
  };

  const nextRelations = [...relations];
  for (const change of result.relationshipChanges || []) {
    const index = nextRelations.findIndex((relation) => relation.name === change.name);
    if (index >= 0) {
      nextRelations[index] = {
        ...nextRelations[index],
        ...change,
        value: clamp(nextRelations[index].value + (Number(change.delta) || 0)),
        status: change.status || nextRelations[index].status,
      };
    } else {
      nextRelations.push({
        ...change,
        name: change.name,
        emoji: change.emoji || SIMULATION_CONFIG.defaultNpcEmoji,
        value: clamp(50 + (Number(change.delta) || 0)),
        status: change.status || "新关系",
      });
    }
  }

  const nextSocialEdges = [...socialEdges];
  for (const change of result.npcRelationshipChanges || []) {
    if (!change.source || !change.target || change.source === change.target) continue;
    const index = nextSocialEdges.findIndex(
      (edge) =>
        (edge.source === change.source && edge.target === change.target) ||
        (edge.source === change.target && edge.target === change.source),
    );
    if (index >= 0) {
      nextSocialEdges[index] = {
        ...nextSocialEdges[index],
        ...change,
        value: clamp(nextSocialEdges[index].value + (change.delta || 0)),
      };
    } else {
      nextSocialEdges.push({ ...change, value: clamp(50 + (change.delta || 0)) });
    }
  }

  const existingNpcNames = new Set(relations.map((item) => item.name));
  const newContactNames = (result.relationshipChanges || [])
    .map((item) => item.name)
    .filter((name) => name && !existingNpcNames.has(name));
  nextSettings.personalityProfile = applyPersonalityTurn(
    settings.personalityProfile,
    result,
    { age: nextAge, settings: nextSettings, relationshipChanges: result.relationshipChanges || [] },
  );

  let newProfiles = normalizeNpcInteractionHistories(npcProfiles, relations, settings);
  for (const profile of result.npcProfiles || []) {
    if (!profile.name) continue;
    const isNew = !newProfiles[profile.name];
    newProfiles[profile.name] = enrichNpcProfile(
      { ...newProfiles[profile.name], ...profile },
      nextAge,
      isNew,
    );
  }
  for (const change of result.relationshipChanges || []) {
    if (change.name && !newProfiles[change.name]) {
      newProfiles[change.name] = createFallbackNpcProfile(change, nextAge);
    }
  }
  newProfiles = recordProtagonistInteractions({
    npcProfiles: newProfiles,
    previousRelations: relations,
    nextRelations,
    historicalContacts,
    changes: result.relationshipChanges || [],
    context: { age: nextAge, title: result.title, event: result.event, summary: result.summary },
  });

  const resumeUpdate = result.resumeUpdate || {};
  const resumeEntry = resumeUpdate.entry;
  const nextResume = {
    ...resume,
    currentRole: resumeUpdate.currentRole || resume.currentRole,
    organization: resumeUpdate.organization ?? resume.organization,
    employmentStatus: resumeUpdate.employmentStatus || resume.employmentStatus,
    education: resumeUpdate.education || resume.education,
    skills: skillTurn.available,
    experiences: resumeEntry
      ? [...(resume.experiences || []), resumeEntry].slice(-80)
      : resume.experiences || [],
  };
  const interactionNames = [
    ...(result.relationshipChanges || []).map((item) => item.name),
    ...(result.npcRelationshipChanges || []).flatMap((item) => [item.source, item.target]),
  ].filter(Boolean);
  const evolvedNetwork = evolveNpcNetwork({
    relations: nextRelations,
    npcProfiles: newProfiles,
    socialEdges: nextSocialEdges,
    historicalContacts,
    yearsPassed,
    interactionNames,
    annualUpdates: result.npcLifecycleUpdates || [],
    protagonistAge: nextAge,
    newContactNames,
  });
  evolvedNetwork.npcProfiles = recordArchivedInteractions(
    evolvedNetwork.npcProfiles,
    evolvedNetwork.archivedNow,
    nextAge,
  );

  const nextTurn = {
    ...blankTurn,
    ...result,
    skillsGained: skillTurn.gained,
    skillsLost: skillTurn.lost,
    skillsUsed: skillTurn.used,
    skillsAvailable: skillTurn.available,
    cashflow: financialTurn.cashflow,
    netWorthChange: financialTurn.netWorthChange,
    financialEntries: financialTurn.entries,
    approval: approvalDecision,
  };
  const nextLog = {
    time: `${age}岁 · ${monthOfYear}月`,
    month,
    title: result.title,
    text: result.log || result.decision,
    tag: result.tag,
    event: result.event,
    thought: result.thought,
    decision: result.decision,
    reason: result.reason,
    summary: result.summary || "",
    gains: result.gains || [],
    losses: result.losses || [],
    cashflow: financialTurn.cashflow,
    netWorthChange: financialTurn.netWorthChange,
    financialEntries: financialTurn.entries,
    roi: result.roi,
    worldChange: result.worldChange,
    worldEvents: result.worldEvents || [],
    worldStateUpdate: result.worldStateUpdate || null,
    death: result.death || { occurred: false },
    skillsGained: skillTurn.gained,
    skillsLost: skillTurn.lost,
    skillsUsed: skillTurn.used,
    skillsAvailable: skillTurn.available,
    physicalStatus: result.physicalStatus || null,
    learningStatus: result.learningStatus || null,
    stateDelta: result.stateDelta || {},
    relationshipChanges: result.relationshipChanges || [],
    relationshipSummary: result.relationshipSummary || "",
    intimacySummary: result.intimacySummary || "",
    npcRelationshipChanges: result.npcRelationshipChanges || [],
    npcLifecycleUpdates: result.npcLifecycleUpdates || [],
    personalityUpdate: result.personalityUpdate || null,
    archivedContacts: evolvedNetwork.archivedNow.map((item) => item.name),
    resumeEntry: resumeEntry || null,
    randomEventAudit: result.randomEventAudit || null,
    outcomeAudit: result.outcomeAudit || null,
    lifeStageAudit: result.lifeStageAudit || null,
    decisionBasis: result.decisionBasis || null,
    approval: approvalDecision,
    domainEvents: [],
  };
  const nextLogs = [...logs, nextLog];
  const domain = deriveDomainEvents({
    result,
    previousState: state,
    nextState,
    financialTurn,
    nextMonth,
    nextAge,
    netWorthBefore: calculateFinancialSummary(state).netWorth,
  });
  nextLog.domainEvents = domain.events;
  nextTurn.domainEvents = domain.events;
  const snapshot = createGameSnapshot({
    month: nextMonth,
    state: nextState,
    relations: evolvedNetwork.relations,
    turn: nextTurn,
    settings: nextSettings,
    logs: nextLogs,
    npcProfiles: evolvedNetwork.npcProfiles,
    socialEdges: evolvedNetwork.socialEdges,
    historicalContacts: evolvedNetwork.historicalContacts,
    resume: nextResume,
  });
  return {
    snapshot,
    domainEvents: domain.events,
    notification: buildMajorNotification(result, domain),
  };
}
