export const SIMULATION_CONFIG = {
  saveVersion: 6,
  defaultNpcEmoji: "🙂",
};

export const MILESTONE_PATTERN =
  /买房|结婚|毕业|创业|生育|退休|首付|房贷|升学|入学|出国|升职|辞职|生子|分手|离婚|搬家|出院|康复|初恋|暗恋|表白|落榜|录取|破产|失业|重逢|决裂|死亡|去世|离世/;

export const LANDING_FEATURES = [
  { id: "probability", icon: "dice", label: "动态概率场" },
  { id: "decision", icon: "brain", label: "自主决策" },
  { id: "evolution", icon: "trend", label: "年度演化" },
  { id: "memory", icon: "people", label: "长期记忆" },
] as const;

type SimulationSettings = {
  name: string;
  startAge: number;
  bio: {
    childhood?: string;
    school?: string;
    personality?: string;
    hobbies?: string;
  };
  personalityProfile?: {
    mbti?: string;
    mbtiLabel?: string;
  };
};

type RelationshipChange = {
  name: string;
  age?: number;
  personality?: string;
  status?: string;
  action?: string;
};

export const createPrologueLog = (
  settings: SimulationSettings,
  detailed = false,
) => {
  if (!detailed) {
    return {
      time: "序章",
      title: "模拟已就绪",
      text: `${settings.name}，${settings.startAge} 岁。此后没有预设剧本。`,
    };
  }

  const parts: string[] = [];
  if (settings.startAge >= 6) {
    parts.push(`童年：${settings.bio.childhood || "尚未生成"}`);
  }
  if (settings.startAge >= 12) {
    parts.push(`中学：${settings.bio.school || "尚未生成"}`);
  }
  parts.push(`性格：${settings.bio.personality || "待模拟形成"}`);
  if (settings.personalityProfile?.mbti) {
    parts.push(
      `初始MBTI：${settings.personalityProfile.mbti} · ${settings.personalityProfile.mbtiLabel || "人格起点"}`,
    );
  }
  parts.push(`爱好：${settings.bio.hobbies || "未知"}`);

  return {
    time: "序章",
    title: `${settings.name}的人物档案`,
    text: parts.join("；"),
  };
};

export const createFallbackNpcProfile = (
  change: RelationshipChange,
  protagonistAge: number,
) => ({
  name: change.name,
  age: Number(change.age) || protagonistAge,
  personality: change.personality || "性格尚在观察中",
  role: change.status || "新认识的人",
  background: "在本轮事件中进入主角的生活",
  motivation: "尚待后续互动揭示",
  relationToProtagonist: change.status || "新关系",
  potentialConflict: "尚未显现",
  lifeStatus: "刚进入主角的生活圈",
  statusSummary: change.action || "等待后续互动",
  createdAtAge: protagonistAge,
  lastUpdatedAge: protagonistAge,
});
