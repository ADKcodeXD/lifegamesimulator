import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceInterests,
  interestFitForLinks,
  parseInitialInterests,
} from "./interestModel.js";

test("profile hobbies become structured interests", () => {
  const interests = parseInitialInterests("摄影、骑行、阅读心理学书籍");
  assert.deepEqual(
    interests.map((item) => item.label),
    ["摄影", "骑行", "阅读心理学书籍"],
  );
  assert.ok(interests.every((item) => item.affinity > 50));
});

test("matching interests raise candidate fit while unrelated ones do not", () => {
  const interests = parseInitialInterests("摄影、骑行");
  const matching = interestFitForLinks(
    [{ interestId: interests[0].id, relevance: 0.8, mode: "existing" }],
    interests,
  );
  const unknown = interestFitForLinks(
    [{ interestId: "missing", relevance: 0.8, mode: "existing" }],
    interests,
  );
  assert.ok(matching > 0);
  assert.ok(unknown < 0);
});

test("interests strengthen, weaken, go dormant, and can be discovered", () => {
  const initial = parseInitialInterests("摄影");
  const engaged = advanceInterests(initial, {
    candidate: {},
    decision: {
      interestEffects: [
        { interestId: initial[0].id, action: "engage", intensity: 0.8 },
      ],
    },
    outcome: { direction: "favorable" },
    turn: 2,
  });
  assert.ok(engaged.interests[0].affinity > initial[0].affinity);
  const abandoned = advanceInterests(engaged.interests, {
    decision: {
      interestEffects: [
        { interestId: initial[0].id, action: "abandon", intensity: 1 },
        { label: "陶艺", action: "explore", intensity: 0.6 },
      ],
    },
    outcome: { direction: "mixed" },
    turn: 3,
  });
  assert.equal(
    abandoned.interests.find((item) => item.id === initial[0].id).status,
    "dormant",
  );
  assert.ok(abandoned.interests.some((item) => item.label === "陶艺"));
});
