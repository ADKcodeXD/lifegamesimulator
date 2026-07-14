const textOf = (...values) =>
  values
    .filter((value) => value !== null && value !== undefined)
    .map((value) => String(value))
    .join(" ");

export function expectedEducationStage(age) {
  const numericAge = Number(age) || 0;
  if (numericAge < 3) return "婴幼儿阶段";
  if (numericAge < 6) return "学龄前阶段";
  if (numericAge < 12) return "小学阶段";
  if (numericAge < 15) return "初中阶段";
  if (numericAge < 18) return "高中/中职阶段";
  if (numericAge < 23) return "高等教育或职业起步阶段";
  return "继续教育或职业发展阶段";
}

/**
 * Keep model-written education state moving forward with elapsed game time.
 * Narrative events remain untouched because an exam may have happened earlier
 * in a long turn; only the end-of-turn state is reconciled.
 */
export function reconcileEducationTimeline({
  result = {},
  resume = {},
  endAge,
  endMonth = 0,
}) {
  const resumeUpdate = { ...(result.resumeUpdate || {}) };
  const learningStatus = result.learningStatus
    ? { ...result.learningStatus }
    : null;
  const endStateText = textOf(
    resumeUpdate.currentRole || resume.currentRole,
    resumeUpdate.employmentStatus || resume.employmentStatus,
    resumeUpdate.education || resume.education,
    learningStatus?.stage,
    learningStatus?.label,
    learningStatus?.detail,
  );
  const juniorStageIsStale = Number(endAge) >= 16 && /中考|初中|初三|九年级/.test(endStateText);
  const seniorStageIsStale = Number(endAge) >= 19 && /高考|高中生|高三/.test(endStateText);

  let corrected = false;
  let reason = "";
  let stage = expectedEducationStage(endAge);

  if (juniorStageIsStale) {
    corrected = true;
    reason = "结束年龄已超过常规初中/中考阶段";
    stage = Number(endAge) < 18 ? "高中/中职阶段" : "高中毕业后的升学或职业过渡阶段";
  } else if (seniorStageIsStale) {
    corrected = true;
    reason = "结束年龄已超过常规高中/高考阶段";
    stage = "高等教育或职业起步阶段";
  }

  if (corrected) {
    resumeUpdate.currentRole = Number(endAge) < 18 ? `${stage}学生` : stage;
    resumeUpdate.education = stage;
    if (/在校|学生|就读|中考|高考|初中|高中/.test(endStateText)) {
      resumeUpdate.employmentStatus = Number(endAge) < 18 ? "在校" : "升学或职业过渡";
    }
    if (/初中|初级中学/.test(resumeUpdate.organization || resume.organization || "")) {
      resumeUpdate.organization = "";
    }
  }

  resumeUpdate.educationTimeline = {
    stage: corrected
      ? stage
      : learningStatus?.stage || resumeUpdate.education || resume.education || stage,
    updatedAtAge: Number(endAge),
    updatedAtMonth: Number(endMonth) || 0,
  };

  return {
    ...result,
    resumeUpdate,
    learningStatus: corrected
      ? {
          stage,
          label: "阶段已随时间推进",
          detail: `${reason}，已停止沿用上一教育阶段。`,
        }
      : learningStatus,
    educationAudit: {
      corrected,
      reason,
      endAge: Number(endAge),
      stage: resumeUpdate.educationTimeline.stage,
    },
  };
}
