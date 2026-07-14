import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveCharacterDecision,
  resolveEventOutcome,
} from "./eventResolutionModel.js";
import { parseInitialInterests } from "./interestModel.js";

const candidate = {
  difficulty: 0.5,
  stakes: 0.3,
  demands: {
    performance: { 运动: 0.7 },
    consequence: {},
  },
};

const decision = { selected: { effort: 0.6 } };
const payload = (athletic, appearance = 50) => ({
  settings: {
    talents: {
      颜值: appearance,
      运动: athletic,
      智力: 50,
      天赋: 50,
      财商: 50,
      社交: 50,
    },
  },
  state: { emotion: 70 },
});

test("event outcomes react strongly to relevant ability", () => {
  const average = resolveEventOutcome(
    candidate,
    decision,
    payload(50),
    () => 0.4,
  );
  const exceptional = resolveEventOutcome(
    candidate,
    decision,
    payload(95),
    () => 0.4,
  );
  assert.ok(
    exceptional.probabilities.favorable >
      average.probabilities.favorable + 0.08,
  );
});

test("unrelated ability does not leak into event outcome", () => {
  const averageAppearance = resolveEventOutcome(
    candidate,
    decision,
    payload(65, 50),
    () => 0.4,
  );
  const exceptionalAppearance = resolveEventOutcome(
    candidate,
    decision,
    payload(65, 98),
    () => 0.4,
  );
  assert.deepEqual(
    exceptionalAppearance.probabilities,
    averageAppearance.probabilities,
  );
});

test("a strong interest favors engagement over abandoning it", () => {
  const interests = parseInitialInterests("摄影");
  const result = resolveCharacterDecision(
    {
      choices: [
        {
          id: "engage",
          action: "继续拍摄",
          drives: {},
          interestEffects: [
            {
              interestId: interests[0].id,
              action: "engage",
              intensity: 0.8,
            },
          ],
          effort: 0.4,
        },
        {
          id: "abandon",
          action: "卖掉相机",
          drives: {},
          interestEffects: [
            {
              interestId: interests[0].id,
              action: "abandon",
              intensity: 0.8,
            },
          ],
          effort: 0.4,
        },
      ],
    },
    {
      settings: { traits: {}, talents: {} },
      state: { emotion: 70 },
      simulation: { interests },
    },
    () => 0.5,
  );
  const engagement = result.utilities.find((item) => item.id === "engage");
  const abandonment = result.utilities.find((item) => item.id === "abandon");
  assert.ok(engagement.interestAlignment > 0);
  assert.ok(abandonment.interestAlignment < 0);
  assert.ok(engagement.utility > abandonment.utility);
});
