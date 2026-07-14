export const GAME_PHASES = Object.freeze({
  IDLE: "idle",
  PREPARING: "preparing",
  AWAITING_APPROVAL: "awaitingApproval",
  GENERATING: "generating",
  VALIDATING: "validating",
  SETTLING: "settling",
  MAJOR_EVENT: "majorEvent",
  SAVING: "saving",
  DEAD: "dead",
  SUMMARIZING: "summarizing",
  ENDED: "ended",
});

const transitions = {
  idle: ["preparing", "summarizing", "ended"],
  preparing: ["awaitingApproval", "generating", "idle"],
  awaitingApproval: ["generating", "idle"],
  generating: ["validating", "idle"],
  validating: ["settling", "idle"],
  settling: ["majorEvent", "saving", "dead", "idle"],
  majorEvent: ["saving", "dead", "idle"],
  saving: ["idle", "dead", "ended"],
  dead: ["summarizing", "ended"],
  summarizing: ["ended", "idle"],
  ended: ["idle"],
};

export const initialGameMachine = {
  phase: GAME_PHASES.IDLE,
  previousPhase: null,
  error: null,
};

export function gameMachineReducer(machine, action) {
  if (action.type === "RESET") return initialGameMachine;
  if (action.type === "FAIL") {
    return {
      phase: GAME_PHASES.IDLE,
      previousPhase: machine.phase,
      error: action.error || "回合执行失败",
    };
  }
  if (action.type !== "TRANSITION") return machine;
  const target = action.phase;
  if (!(transitions[machine.phase] || []).includes(target)) {
    return {
      ...machine,
      error: `非法状态转移：${machine.phase} → ${target}`,
    };
  }
  return { phase: target, previousPhase: machine.phase, error: null };
}

export const isMachineBusy = (phase) =>
  ![GAME_PHASES.IDLE, GAME_PHASES.ENDED].includes(phase);

export const progressPhaseFor = (phase) =>
  ({
    preparing: "reading",
    awaitingApproval: "reading",
    generating: "reasoning",
    validating: "tools",
    settling: "writing",
    majorEvent: "writing",
    saving: "writing",
  })[phase] || "reading";
