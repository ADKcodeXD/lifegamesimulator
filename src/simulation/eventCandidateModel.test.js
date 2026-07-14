import test from "node:test";
import assert from "node:assert/strict";
import {
  auditCandidate,
  normalizeCandidate,
  selectCandidate,
} from "./eventCandidateModel.js";

const context = {
  facts: [
    { id: "person.role", value: "在校学生" },
    { id: "npc.父亲", value: "父亲与主角共同生活" },
  ],
  activeProcesses: [{ id: "school", pressure: 50 }],
  relevantNpcs: [{ name: "父亲", turnsSinceConflict: 0 }],
  protagonist: {
    abilities: {
      颜值: { score: 50 },
      运动: { score: 50 },
      智力: { score: 50 },
      天赋: { score: 50 },
      财商: { score: 50 },
      社交: { score: 50 },
    },
  },
};

const baseCandidate = {
  id: "school_day",
  premise: "课程安排发生小变化",
  actors: ["主角"],
  sourceFactIds: ["person.role"],
  triggerMechanism: "学校日程调整",
  dramaticQuestion: "是否调整原有安排",
  choices: [{ id: "adjust", action: "调整安排", drives: {}, effort: 0.4 }],
  demands: {},
  signature: { setting: "学校", mechanism: "日程调整", issue: "时间安排" },
};

test("candidate audit rejects unsupported leaps and unintroduced actors", () => {
  const candidate = normalizeCandidate({
    ...baseCandidate,
    actors: ["主角", "陌生投资人"],
    sourceFactIds: ["missing.fact"],
  });
  const audit = auditCandidate(candidate, context);
  assert.equal(audit.valid, false);
  assert.ok(audit.errors.includes("unsupported"));
  assert.ok(audit.errors.includes("unintroduced-actor"));
});

test("relationship cooldown blocks an immediate repeat conflict", () => {
  const candidate = normalizeCandidate({
    ...baseCandidate,
    id: "repeat_conflict",
    actors: ["主角", "父亲"],
    sourceFactIds: ["person.role", "npc.父亲"],
    triggerMechanism: "父亲再次干预并发生争吵",
    dramaticQuestion: "是否继续冲突",
  });
  const audit = auditCandidate(candidate, context);
  assert.equal(audit.valid, false);
  assert.ok(audit.errors.includes("relationship-cooldown"));
});

test("selection prefers causally supported candidates", () => {
  const unsupported = {
    ...baseCandidate,
    id: "unsupported",
    sourceFactIds: ["missing"],
  };
  const selection = selectCandidate(
    [unsupported, baseCandidate],
    context,
    { topicLedger: [] },
    2,
    () => 0.4,
  );
  assert.equal(selection.selected.id, "school_day");
  assert.ok(selection.rejected.includes("unsupported"));
});
