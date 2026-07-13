export const NPC_LIFECYCLE_CONFIG = {
  archiveBelowValue: 32,
  archiveAfterInactiveYears: 3,
  archiveInactiveBelowValue: 50,
} as const;

export const RELATIONSHIP_BANDS = [
  { min: 80, label: "亲密", range: "80+", color: "#3abf8b", annualDecay: 2 },
  { min: 60, label: "熟悉", range: "60-79", color: "#6c5ce7", annualDecay: 2 },
  { min: 40, label: "淡交", range: "40-59", color: "#f0a03a", annualDecay: 4 },
  { min: 0, label: "疏远", range: "0-39", color: "#e26055", annualDecay: 6 },
] as const;

export const relationshipBandFor = (value: number) =>
  RELATIONSHIP_BANDS.find((band) => value >= band.min) ||
  RELATIONSHIP_BANDS[RELATIONSHIP_BANDS.length - 1];
