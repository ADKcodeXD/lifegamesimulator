export const BODY_TYPES = [
  "消瘦",
  "偏瘦",
  "匀称",
  "健壮",
  "肌肉型",
  "微胖",
  "肥胖",
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const growthRatio = (age, gender) => {
  if (age >= 18) return 1;
  if (age <= 1) return 0.45 + age * 0.08;
  if (age < 6) return 0.53 + (age - 1) * 0.045;
  if (age < 12) return 0.755 + (age - 6) * 0.022;
  const pubertyBoost = gender === "女" ? 0.021 : 0.025;
  return clamp(0.887 + (age - 12) * pubertyBoost, 0.887, 1);
};

export function createBodyProfile(settings = {}, age = settings.startAge ?? 18) {
  const adultHeightCm = clamp(
    Number(settings.physicalProfile?.adultHeightCm) ||
      (settings.gender === "女" ? 163 : 175),
    130,
    220,
  );
  return {
    adultHeightCm: Math.round(adultHeightCm),
    currentHeightCm: Math.round(
      adultHeightCm * growthRatio(Number(age) || 0, settings.gender),
    ),
    bodyType: BODY_TYPES.includes(settings.physicalProfile?.initialBodyType)
      ? settings.physicalProfile.initialBodyType
      : "匀称",
    lastChange: "初始身体档案",
  };
}

export function normalizeBodyProfile(profile, settings = {}, age) {
  const fallback = createBodyProfile(settings, age);
  return {
    ...fallback,
    ...(profile || {}),
    adultHeightCm: fallback.adultHeightCm,
    currentHeightCm: Math.min(
      fallback.adultHeightCm,
      Math.max(
        Number(profile?.currentHeightCm) || fallback.currentHeightCm,
        fallback.currentHeightCm,
      ),
    ),
    bodyType: BODY_TYPES.includes(profile?.bodyType)
      ? profile.bodyType
      : fallback.bodyType,
  };
}

export function evolveBodyProfile(profile, settings, result, nextAge) {
  const current = normalizeBodyProfile(profile, settings, nextAge);
  const requestedType = result.bodyUpdate?.bodyType;
  const bodyType = BODY_TYPES.includes(requestedType)
    ? requestedType
    : current.bodyType;
  return {
    ...current,
    currentHeightCm: createBodyProfile(settings, nextAge).currentHeightCm,
    bodyType,
    lastChange:
      bodyType !== current.bodyType
        ? result.bodyUpdate?.reason || "生活方式改变了身材"
        : current.lastChange,
  };
}
