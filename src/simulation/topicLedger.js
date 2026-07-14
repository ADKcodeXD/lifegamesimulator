const compact = (value) =>
  String(value || "")
    .trim()
    .slice(0, 80);

const canonicalize = (value) =>
  compact(value)
    .replace(/家里|家里面/g, "家中")
    .replace(/反对|施压|逼迫|干涉/g, "干预")
    .replace(/冲突|吵架|争吵/g, "争执")
    .replace(/岗位|职位/g, "工作")
    .replace(/离开|辞职/g, "辞去")
    .replace(/要不要|该不该/g, "是否");

const bigrams = (value) => {
  const text = canonicalize(value).replace(/[\s|·,，。；;：:、]/g, "");
  if (!text) return new Set();
  if (text.length === 1) return new Set([text]);
  return new Set(
    Array.from({ length: text.length - 1 }, (_, index) =>
      text.slice(index, index + 2),
    ),
  );
};

const jaccard = (left, right) => {
  const a = bigrams(left);
  const b = bigrams(right);
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((item) => b.has(item)).length;
  return intersection / (a.size + b.size - intersection);
};

export function normalizeEventSignature(signature = {}) {
  return {
    actors: Array.isArray(signature.actors)
      ? signature.actors.filter(Boolean).map(compact).slice(0, 4)
      : [],
    setting: compact(signature.setting),
    mechanism: compact(signature.mechanism),
    issue: compact(signature.issue),
    outcomeShape: compact(signature.outcomeShape),
  };
}

export function signatureKey(signature = {}) {
  const normalized = normalizeEventSignature(signature);
  return [
    normalized.actors.slice().sort().join("+"),
    normalized.setting,
    normalized.mechanism,
    normalized.issue,
  ].join("|");
}

export function signatureSimilarity(left = {}, right = {}) {
  const a = normalizeEventSignature(left);
  const b = normalizeEventSignature(right);
  const actorOverlap = a.actors.some((name) => b.actors.includes(name)) ? 1 : 0;
  return (
    actorOverlap * 0.2 +
    jaccard(a.setting, b.setting) * 0.15 +
    jaccard(a.mechanism, b.mechanism) * 0.35 +
    jaccard(a.issue, b.issue) * 0.3
  );
}

export function repetitionPenalty(signature, ledger = [], currentTurn = 0) {
  return ledger.reduce((highest, entry) => {
    const distance = Math.max(0, currentTurn - Number(entry.turn || 0));
    if (distance > 12) return highest;
    const recency =
      distance <= 1 ? 1 : distance <= 3 ? 0.72 : distance <= 6 ? 0.42 : 0.2;
    const similarity = signatureSimilarity(signature, entry.signature || entry);
    return Math.max(highest, similarity * recency);
  }, 0);
}

export function recordEventSignature(
  ledger = [],
  signature,
  turn,
  processId = null,
) {
  const normalized = normalizeEventSignature(signature);
  const key = signatureKey(normalized);
  const previous = ledger.find((entry) => entry.key === key);
  return [
    ...ledger.filter((entry) => entry.key !== key),
    {
      key,
      signature: normalized,
      turn,
      processId,
      occurrenceCount: Number(previous?.occurrenceCount || 0) + 1,
    },
  ].slice(-40);
}

export function signatureFromResult(result = {}) {
  const relationshipActors = (result.relationshipChanges || [])
    .map((item) => item.name)
    .filter(Boolean);
  return normalizeEventSignature({
    actors: relationshipActors.length ? relationshipActors : ["主角"],
    setting:
      result.emergentEvent?.signature?.setting || result.tag || "日常环境",
    mechanism:
      result.emergentEvent?.signature?.mechanism ||
      result.emergentEvent?.triggerMechanism ||
      result.title,
    issue:
      result.emergentEvent?.signature?.issue ||
      result.decision ||
      result.reason,
    outcomeShape: result.outcomeAudit?.direction || "unknown",
  });
}
