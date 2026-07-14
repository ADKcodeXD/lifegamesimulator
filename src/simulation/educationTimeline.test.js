import test from "node:test";
import assert from "node:assert/strict";
import { reconcileEducationTimeline } from "./educationTimeline.js";
import { applyFinancialTurn, createInitialState } from "./financeModel.js";

test("an 18-year-old cannot retain a middle-school exam as the current state", () => {
  const result = reconcileEducationTimeline({
    result: {
      learningStatus: { stage: "中考备考", label: "稳定", detail: "继续复习中考" },
      resumeUpdate: {
        currentRole: "初三学生",
        employmentStatus: "在校",
        education: "初中阶段",
      },
    },
    resume: {},
    endAge: 18,
    endMonth: 24,
  });

  assert.equal(result.educationAudit.corrected, true);
  assert.doesNotMatch(result.learningStatus.stage, /中考|初中/);
  assert.doesNotMatch(result.resumeUpdate.currentRole, /中考|初中|初三/);
  assert.equal(result.resumeUpdate.educationTimeline.updatedAtAge, 18);
});

test("a dependent 18-year-old student does not receive an automatic adult household bill", () => {
  const initial = createInitialState(10_000);
  const result = applyFinancialTurn(
    initial,
    { monthlyIncome: 0, financialTransactions: [] },
    {
      age: 18,
      monthsPerTurn: 12,
      resume: {
        currentRole: "高中学生",
        employmentStatus: "在校",
        education: "高中阶段",
      },
      settings: { world: "中国普通城市" },
    },
  );

  assert.equal(result.cashflow, 0);
  assert.equal(result.entries.length, 0);
});

test("a stale middle-school save is corrected before the age-18 finance settlement", () => {
  const staleResume = {
    currentRole: "初三学生",
    employmentStatus: "在校",
    education: "初中阶段",
  };
  const reconciled = reconcileEducationTimeline({
    result: {
      monthlyIncome: 0,
      financialTransactions: [],
      resumeUpdate: { ...staleResume },
    },
    resume: staleResume,
    endAge: 18,
    endMonth: 24,
  });
  const financial = applyFinancialTurn(createInitialState(10_000), reconciled, {
    age: 18,
    monthsPerTurn: 12,
    resume: staleResume,
    settings: { world: "中国普通城市" },
  });

  assert.equal(financial.cashflow, 0);
  assert.equal(financial.entries.length, 0);
});

test("an independently working adult still receives recurring living costs", () => {
  const initial = createInitialState(10_000);
  const result = applyFinancialTurn(
    initial,
    { monthlyIncome: 6_000, financialTransactions: [] },
    {
      age: 18,
      monthsPerTurn: 1,
      resume: { currentRole: "公司职员", employmentStatus: "在职" },
      settings: { world: "中国普通城市" },
    },
  );

  assert.ok(result.entries.some((entry) => entry.kind === "income"));
  assert.ok(result.entries.some((entry) => entry.kind === "expense"));
});
