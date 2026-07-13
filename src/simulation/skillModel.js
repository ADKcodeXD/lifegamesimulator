import {
  CANONICAL_SKILLS,
  COMPOSITE_DOMINATES,
  SKILL_LIMITS,
  SKILL_TIERS,
} from "../data/skillConfig.ts";

const clean = (value) => String(value || "").trim();
const lower = (value) => clean(value).toLocaleLowerCase();

const AI_RELATED_PATTERN =
  /数据|模型|算法|python|研究|学术|文献|伦理|对齐|推理|训练|算力|智能|自动化|红队|可视化/i;
const MANAGEMENT_RELATED_PATTERN = /团队|管理|统筹|协同|流程|调度|资产管理/i;
const INTERVIEW_RELATED_PATTERN = /面试|访谈|人才评估|招聘/i;

const definitions = Object.entries(CANONICAL_SKILLS);
const skillOrder = Object.keys(CANONICAL_SKILLS);

function matchedCanonicalSkills(rawSkills) {
  const source = rawSkills.map(clean).filter(Boolean);
  const hasAiContext = source.some((item) =>
    CANONICAL_SKILLS.AI专家.patterns.some((pattern) =>
      lower(item).includes(lower(pattern)),
    ),
  );
  const matches = [];

  for (const rawSkill of source) {
    const normalized = lower(rawSkill);
    const directlyAi = CANONICAL_SKILLS.AI专家.patterns.some((pattern) =>
      normalized.includes(lower(pattern)),
    );
    const belongsToAiCluster =
      directlyAi || (hasAiContext && AI_RELATED_PATTERN.test(rawSkill));
    for (const [name, definition] of definitions) {
      if (belongsToAiCluster && name !== "AI专家") continue;
      if (
        definition.patterns.some((pattern) =>
          normalized.includes(lower(pattern)),
        )
      ) {
        matches.push(name);
      }
    }
    if (belongsToAiCluster) matches.push("AI专家");
    if (MANAGEMENT_RELATED_PATTERN.test(rawSkill)) matches.push("管理经验");
    if (INTERVIEW_RELATED_PATTERN.test(rawSkill)) matches.push("大厂面试官");
  }

  return [...new Set(matches)];
}

function removeDominatedSkills(skills) {
  const result = new Set(skills);
  for (const [composite, dominated] of Object.entries(COMPOSITE_DOMINATES)) {
    if (!result.has(composite)) continue;
    dominated.forEach((skill) => result.delete(skill));
  }
  return [...result];
}

export function normalizeSkills(...collections) {
  const rawSkills = collections.flat(Infinity).filter(Boolean);
  const matched = removeDominatedSkills(matchedCanonicalSkills(rawSkills));
  const tierCounts = {};

  return matched
    .sort((a, b) => {
      const aLevel = SKILL_TIERS[CANONICAL_SKILLS[a].tier].level;
      const bLevel = SKILL_TIERS[CANONICAL_SKILLS[b].tier].level;
      return bLevel - aLevel || skillOrder.indexOf(a) - skillOrder.indexOf(b);
    })
    .filter((skill) => {
      const tier = CANONICAL_SKILLS[skill].tier;
      tierCounts[tier] = (tierCounts[tier] || 0) + 1;
      return tierCounts[tier] <= SKILL_LIMITS.perTier;
    })
    .slice(0, SKILL_LIMITS.total);
}

export function groupSkillsByTier(skills) {
  const normalized = normalizeSkills(skills);
  return Object.entries(SKILL_TIERS).map(([id, tier]) => ({
    id,
    ...tier,
    skills: normalized.filter((skill) => CANONICAL_SKILLS[skill]?.tier === id),
  }));
}

export function reconcileSkillTurn(previousSkills, result = {}) {
  const previousInventory = normalizeSkills(previousSkills);
  const lost = normalizeSkills(result.skillsLost)
    .filter((skill) => previousInventory.includes(skill))
    .slice(0, 1);
  const retained = previousInventory.filter((skill) => !lost.includes(skill));
  const candidates = normalizeSkills(
    result.resumeUpdate?.skills,
    result.skillsAvailable,
    result.skillsGained,
  );
  const previous = new Set(retained);
  const gained = candidates.filter((skill) => !previous.has(skill)).slice(0, 1);
  const available = normalizeSkills(retained, gained);
  const used = normalizeSkills(result.skillsUsed).filter((skill) =>
    available.includes(skill),
  );

  return { available, gained, lost, used };
}
