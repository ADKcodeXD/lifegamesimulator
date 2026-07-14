import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceSimulationState,
  createInitialSimulationState,
  migrateGameSave,
} from "./simulationState.js";

const context = {
  settings: {
    world: "2026年，某城市。就业结构正在变化。生活成本较高。",
    bio: { hobbies: "摄影、骑行" },
  },
  relations: [{ name: "父亲" }],
  resume: { currentRole: "学生" },
  month: 0,
};

test("v7 saves migrate with an emergent simulation and interest state", () => {
  const migrated = migrateGameSave({ version: 7, ...context, history: [] });
  assert.equal(migrated.version, 9);
  assert.ok(migrated.simulation.processes.length > 0);
  assert.ok(migrated.simulation.worldProcesses.length > 0);
  assert.ok(migrated.simulation.npcAgendas.父亲);
  assert.deepEqual(
    migrated.simulation.interests.map((interest) => interest.label),
    ["摄影", "骑行"],
  );
});

test("settled turns update topic memory and relationship cooldown", () => {
  const initial = createInitialSimulationState(context);
  const next = advanceSimulationState(
    initial,
    {
      title: "与父亲发生争执",
      emergentEvent: {
        signature: {
          actors: ["父亲"],
          setting: "家中",
          mechanism: "职业争执",
          issue: "是否转行",
        },
      },
      relationshipChanges: [
        { name: "父亲", eventType: "冲突", memory: "父亲反对转行" },
      ],
    },
    { ...context, turnNumber: 2 },
  );
  assert.equal(next.topicLedger.length, 1);
  assert.equal(next.npcAgendas.父亲.turnsSinceConflict, 0);
  assert.equal(next.npcAgendas.父亲.unresolvedIssuesWithProtagonist.length, 1);
});

test("settled choices dynamically update an interest", () => {
  const initial = createInitialSimulationState(context);
  const photography = initial.interests.find(
    (interest) => interest.label === "摄影",
  );
  const next = advanceSimulationState(
    initial,
    {
      emergentEvent: {
        interestLinks: [
          {
            interestId: photography.id,
            label: photography.label,
            mode: "existing",
            relevance: 0.9,
          },
        ],
      },
      emergentDecision: {
        interestEffects: [
          {
            interestId: photography.id,
            label: photography.label,
            action: "engage",
            intensity: 0.9,
          },
        ],
      },
      outcomeAudit: { direction: "favorable" },
    },
    { ...context, turnNumber: 3 },
  );
  assert.ok(
    next.interests.find((interest) => interest.id === photography.id).affinity >
      photography.affinity,
  );
  assert.equal(next.lastInterestChanges[0].label, "摄影");
});
