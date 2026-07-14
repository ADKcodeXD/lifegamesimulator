import { SIMULATION_CONFIG } from "../data/simulationTemplates";

export function createGameSnapshot(parts) {
  return {
    version: SIMULATION_CONFIG.saveVersion,
    month: parts.month,
    state: parts.state,
    relations: parts.relations,
    turn: parts.turn,
    settings: parts.settings,
    logs: parts.logs,
    npcProfiles: parts.npcProfiles,
    socialEdges: parts.socialEdges,
    historicalContacts: parts.historicalContacts,
    resume: parts.resume,
    lifecycle: parts.turn?.death?.occurred ? "dead" : "alive",
  };
}

export function serializeGameSave(snapshot, history) {
  return JSON.stringify({ ...snapshot, history });
}
