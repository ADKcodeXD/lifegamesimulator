import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceSimulationState,
  createInitialSimulationState,
  migrateGameSave,
} from "./simulationState.js";

const context = {
  settings: { world: "2026年，某城市。就业结构正在变化。生活成本较高。" },
  relations: [{ name: "父亲" }],
  resume: { currentRole: "学生" },
  month: 0,
};

test("v7 saves migrate with an emergent simulation state", () => {
  const migrated = migrateGameSave({ version: 7, ...context, history: [] });
  assert.equal(migrated.version, 8);
  assert.ok(migrated.simulation.processes.length > 0);
  assert.ok(migrated.simulation.worldProcesses.length > 0);
  assert.ok(migrated.simulation.npcAgendas.父亲);
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
