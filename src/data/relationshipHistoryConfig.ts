export const RELATION_EVENT_TYPES = {
  family: { label: "成为家人", tone: "family" },
  met: { label: "相识", tone: "met" },
  reunion: { label: "重逢", tone: "reunion" },
  warming: { label: "关系升温", tone: "positive" },
  closer: { label: "关系靠近", tone: "positive" },
  conflict: { label: "产生隔阂", tone: "negative" },
  deteriorated: { label: "关系恶化", tone: "negative" },
  rupture: { label: "决裂", tone: "rupture" },
  betrayal: { label: "遭遇背叛", tone: "rupture" },
  repaired: { label: "关系修复", tone: "reunion" },
  interaction: { label: "重要互动", tone: "neutral" },
  faded: { label: "自然淡出", tone: "neutral" },
} as const;

export const RELATION_EVENT_THRESHOLDS = {
  warming: 18,
  closer: 7,
  conflict: -7,
  deteriorated: -18,
  maximumPerNpc: 80,
};

export const RUPTURE_PATTERN = /决裂|绝交|断联|分手|离婚|反目|断绝/;
export const BETRAYAL_PATTERN = /出轨|背叛|欺骗感情|劈腿|骗婚/;
export const REPAIR_PATTERN = /和解|复合|重归于好|冰释前嫌|修复关系/;
