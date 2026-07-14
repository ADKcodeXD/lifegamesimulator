import test from "node:test";
import assert from "node:assert/strict";
import {
  recordEventSignature,
  repetitionPenalty,
  signatureSimilarity,
} from "./topicLedger.js";

test("semantic event signatures catch paraphrased repetitions", () => {
  const previous = {
    actors: ["父亲"],
    setting: "家中",
    mechanism: "父亲干预职业选择并发生争吵",
    issue: "是否辞去稳定工作",
  };
  const paraphrased = {
    actors: ["父亲"],
    setting: "家里",
    mechanism: "父亲反对职业决定，引发冲突",
    issue: "要不要离开稳定岗位",
  };
  assert.ok(signatureSimilarity(previous, paraphrased) > 0.35);
  const ledger = recordEventSignature([], previous, 4);
  assert.ok(repetitionPenalty(paraphrased, ledger, 5) > 0.35);
});

test("old unrelated events do not create a strong repetition penalty", () => {
  const ledger = recordEventSignature(
    [],
    {
      actors: ["同学"],
      setting: "操场",
      mechanism: "临时比赛",
      issue: "是否上场",
    },
    1,
  );
  const penalty = repetitionPenalty(
    {
      actors: ["母亲"],
      setting: "医院",
      mechanism: "陪伴复诊",
      issue: "如何安排时间",
    },
    ledger,
    15,
  );
  assert.equal(penalty, 0);
});
