import React, { useEffect, useState, useRef } from "react";
import EventCard from "./components/EventCard";
import { IconButton, Logo, Stat } from "./components/Common";
import RelationshipGraphModal from "./components/RelationshipGraphModal";
import HistoryModal from "./components/HistoryModal";
import SummaryModal from "./components/SummaryModal";
import KeyModal from "./components/KeyModal";
import PlanModal from "./components/PlanModal";
import SetupModal from "./components/SetupModal";
import LeftPanel from "./components/LeftPanel";
import RightPanel from "./components/RightPanel";
import MobileSheet from "./components/MobileSheet";
import BottomPlayer from "./components/BottomPlayer";
import ApprovalRequest from "./components/ApprovalRequest";
import ProfileDetailModal from "./components/ProfileDetailModal";
import AssetLedgerModal from "./components/AssetLedgerModal";
import {
  FAMILY_LEVELS,
  parentToRelation,
  parentsForFamily,
} from "./data/family";
import { normalizeSettings } from "./data/setupConfig";
import { DEFAULT_LLM_CONFIG, LLM_STORAGE_KEYS } from "./data/llmConfig";
import {
  createFallbackNpcProfile,
  createPrologueLog,
  LANDING_FEATURES,
  MILESTONE_PATTERN,
  SIMULATION_CONFIG,
} from "./data/simulationTemplates";
import {
  avatarFor,
  blankTurn,
  clamp,
  createInitialNpcProfiles,
  createInitialResume,
  getCurrentActivity,
  INITIAL_RELATIONS,
  INITIAL_SOCIAL_EDGES,
  createInitialState,
  money,
  STATUS_TAGS,
} from "./data/gameState";
import {
  applyFinancialTurn,
  calculateFinancialSummary,
  normalizeFinancialState,
} from "./simulation/financeModel";
import { reconcileSkillTurn, normalizeSkills } from "./simulation/skillModel";
import {
  enrichNpcProfile,
  evolveNpcNetwork,
  removeLegacyFixedContact,
} from "./simulation/npcLifecycle";
import {
  normalizeNpcInteractionHistories,
  recordArchivedInteractions,
  recordProtagonistInteractions,
} from "./simulation/relationshipHistory";
import {
  applyPersonalityTurn,
  createInitialPersonalityProfile,
} from "./simulation/personalityModel";
import {
  callLifeSummary,
  callSimulator,
  generateApprovalRequest,
  generateCharacterProfile,
  generateParentProfiles,
} from "./services/llm";
import { exportLifePoster } from "./utils/poster";
import { formatWorldMoney } from "./simulation/probabilityModel";
import {
  Activity,
  ArrowRight,
  Bot,
  Brain,
  CalendarDays,
  ChevronRight,
  Compass,
  Dices,
  Download,
  Flag,
  Gauge,
  Heart,
  KeyRound,
  Landmark,
  Menu,
  Network,
  Pause,
  Play,
  Plus,
  RefreshCcw,
  RotateCcw,
  Save,
  Settings2,
  Sparkles,
  Target,
  TrendingUp,
  UsersRound,
  WalletCards,
  X,
  Zap,
} from "lucide-react";

const LANDING_ICONS = {
  dice: Dices,
  brain: Brain,
  trend: TrendingUp,
  people: UsersRound,
};

const normalizeResume = (resume, settings) => {
  const fallback = createInitialResume(settings);
  return {
    ...fallback,
    ...(resume || {}),
    skills: normalizeSkills(resume?.skills),
    experiences: Array.isArray(resume?.experiences) ? resume.experiences : [],
  };
};

export default function App() {
  const [started, setStarted] = useState(false),
    [setupOpen, setSetupOpen] = useState(false),
    [planOpen, setPlanOpen] = useState(false),
    [keyOpen, setKeyOpen] = useState(false),
    [simulating, setSimulating] = useState(false),
    [summaryOpen, setSummaryOpen] = useState(false),
    [historyOpen, setHistoryOpen] = useState(false),
    [summaryLoading, setSummaryLoading] = useState(false),
    [profileGenerating, setProfileGenerating] = useState(false),
    [parentGenerating, setParentGenerating] = useState(false),
    [autoPlay, setAutoPlay] = useState(false),
    [playbackIndex, setPlaybackIndex] = useState(0),
    [expandedLog, setExpandedLog] = useState(null),
    [relGraphOpen, setRelGraphOpen] = useState(false),
    [selectedNpcName, setSelectedNpcName] = useState(null),
    [rightTab, setRightTab] = useState("finance"),
    [mobileSheet, setMobileSheet] = useState(null),
    [profileExpanded, setProfileExpanded] = useState(false),
    [milestoneDetail, setMilestoneDetail] = useState(null),
    [eventExpanded, setEventExpanded] = useState(false),
    [assetLedgerOpen, setAssetLedgerOpen] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(null);
  const [profileDetailOpen, setProfileDetailOpen] = useState(false);
  const approvalResolverRef = useRef(null);
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem(LLM_STORAGE_KEYS.apiKey) || "",
  );
  const [endpoint, setEndpoint] = useState(
    () =>
      localStorage.getItem(LLM_STORAGE_KEYS.endpoint) ||
      DEFAULT_LLM_CONFIG.endpoint,
  );
  const [model, setModel] = useState(
    () =>
      localStorage.getItem(LLM_STORAGE_KEYS.model) || DEFAULT_LLM_CONFIG.model,
  );
  const [settings, setSettings] = useState(() => normalizeSettings());
  const [resume, setResume] = useState(() => createInitialResume(settings));
  const [socialEdges, setSocialEdges] = useState(INITIAL_SOCIAL_EDGES);
  const [historicalContacts, setHistoricalContacts] = useState([]);
  const [month, setMonth] = useState(0),
    [state, setState] = useState(() =>
      createInitialState(settings.initialCash),
    ),
    [relations, setRelations] = useState(INITIAL_RELATIONS),
    [npcProfiles, setNpcProfiles] = useState(() =>
      normalizeNpcInteractionHistories(
        createInitialNpcProfiles(settings),
        INITIAL_RELATIONS,
        settings,
      ),
    ),
    [turn, setTurn] = useState(blankTurn),
    [error, setError] = useState("");
  const [logs, setLogs] = useState(() => [createPrologueLog(settings)]);
  const [summary, setSummary] = useState(null),
    [summaryError, setSummaryError] = useState("");
  const [history, setHistory] = useState([]),
    [hasSave, setHasSave] = useState(
      () => !!localStorage.getItem("life_saved_game"),
    );
  const age = (settings.startAge ?? 18) + Math.floor(month / 12),
    monthOfYear = (month % 12) + 1,
    financialSummary = calculateFinancialSummary(state),
    netWorth = financialSummary.netWorth;
  const spouse = relations.find((r) =>
    /配偶|夫妻|妻子|丈夫|爱人|伴侣/.test(r.status),
  );
  const milestones = logs
    .filter((l) => MILESTONE_PATTERN.test(l.title + l.text))
    .slice(-6);
  useEffect(() => {
    if (!started) setState(createInitialState(settings.initialCash));
  }, [settings.initialCash, started]);
  useEffect(() => {
    if (!settings.parents?.length) return;
    setRelations((current) => {
      const parentRelations = settings.parents.map((parent) => {
        const existing = current.find(
          (relation) =>
            relation.name === parent.name ||
            relation.relationToProtagonist === parent.relationToProtagonist,
        );
        return {
          ...parentToRelation(parent),
          value: existing?.value ?? 72,
          status:
            existing?.status || parent.relationToProtagonist || parent.name,
          action: existing?.action,
        };
      });
      return [
        ...parentRelations,
        ...current.filter(
          (relation) =>
            !["父亲", "母亲"].includes(relation.name) &&
            !["父亲", "母亲"].includes(relation.relationToProtagonist),
        ),
      ];
    });
    setNpcProfiles((current) => ({
      ...current,
      ...Object.fromEntries(
        settings.parents.map((parent) => [
          parent.name,
          { ...current[parent.name], ...parent },
        ]),
      ),
    }));
  }, [settings.parents]);
  useEffect(() => {
    if (!started) {
      setLogs([createPrologueLog(settings, true)]);
    }
  }, [settings.name, settings.bio, settings.startAge, started]);

  const simulate = async () => {
    if (!apiKey) {
      setKeyOpen(true);
      return;
    }
    setSimulating(true);
    setEventExpanded(false);
    setError("");
    try {
      const llmConfig = {
        apiKey,
        endpoint: localStorage.getItem(LLM_STORAGE_KEYS.endpoint) || endpoint,
        model: localStorage.getItem(LLM_STORAGE_KEYS.model) || model,
      };
      let approvalDecision = null;
      if (Math.random() < SIMULATION_CONFIG.approvalChance) {
        const approvalRequest = await generateApprovalRequest(llmConfig, {
          settings,
          state,
          relations,
          logs,
          month,
          turn,
          resume,
          socialEdges,
        });
        approvalDecision = await new Promise((resolve) => {
          approvalResolverRef.current = resolve;
          setPendingApproval({ ...approvalRequest, requestId: Date.now() });
        });
      }
      const result = await callSimulator(llmConfig, {
        settings,
        state,
        relations,
        logs,
        month,
        turn,
        approvalDecision,
        resume,
        socialEdges,
        npcProfiles,
        historicalContacts,
      });
      const skillTurn = reconcileSkillTurn(resume.skills, result);
      const d = result.stateDelta || {};
      const turnMonths = settings.monthsPerTurn || 6;
      const nextMonth = month + turnMonths;
      const yearsPassed = Math.floor(nextMonth / 12) - Math.floor(month / 12);
      const nextProtagonistAge =
        (settings.startAge ?? 18) + Math.floor(nextMonth / 12);
      const inactiveCareer = /失业|待业|空窗|Gap|停工|退休|休学/.test(
        `${result.statusLabel || ""} ${result.tag || ""} ${result.resumeUpdate?.employmentStatus || ""}`,
      );
      const stateDrift = {
        health:
          nextProtagonistAge >= 55
            ? -yearsPassed *
              Math.max(1, Math.floor((nextProtagonistAge - 45) / 30))
            : 0,
        career: inactiveCareer
          ? -Math.max(yearsPassed * 2, turnMonths >= 6 ? 1 : 0)
          : 0,
      };
      const financialTurn = applyFinancialTurn(state, result, {
        month,
        age,
        monthOfYear,
        time: `${age}岁 · ${monthOfYear}月`,
        title: result.title,
      });
      const nextState = {
        ...financialTurn.state,
        income: Math.max(0, result.monthlyIncome ?? state.income ?? 0),
        health: clamp(state.health + (d.health || 0) + stateDrift.health),
        mood: clamp(state.mood + (d.mood || 0)),
        career: clamp(state.career + (d.career || 0) + stateDrift.career),
      };
      const nextSettings = {
        ...settings,
        traits: Object.fromEntries(
          Object.entries(settings.traits).map(([k, v]) => [
            k,
            clamp(v + (result.traitDelta?.[k] || 0)),
          ]),
        ),
      };
      const nextRelations = [...relations];
      for (const c of result.relationshipChanges || []) {
        const i = nextRelations.findIndex((r) => r.name === c.name);
        if (i >= 0)
          nextRelations[i] = {
            ...nextRelations[i],
            ...c,
            value: clamp(nextRelations[i].value + (Number(c.delta) || 0)),
            status: c.status || nextRelations[i].status,
          };
        else
          nextRelations.push({
            ...c,
            name: c.name,
            emoji: c.emoji || SIMULATION_CONFIG.defaultNpcEmoji,
            value: clamp(50 + (Number(c.delta) || 0)),
            status: c.status || "新关系",
          });
      }
      const nextSocialEdges = [...socialEdges];
      for (const change of result.npcRelationshipChanges || []) {
        if (!change.source || !change.target || change.source === change.target)
          continue;
        const index = nextSocialEdges.findIndex(
          (edge) =>
            (edge.source === change.source && edge.target === change.target) ||
            (edge.source === change.target && edge.target === change.source),
        );
        if (index >= 0) {
          nextSocialEdges[index] = {
            ...nextSocialEdges[index],
            ...change,
            value: clamp(nextSocialEdges[index].value + (change.delta || 0)),
          };
        } else {
          nextSocialEdges.push({
            ...change,
            value: clamp(50 + (change.delta || 0)),
          });
        }
      }
      const existingNpcNames = new Set(relations.map((item) => item.name));
      const newContactNames = (result.relationshipChanges || [])
        .map((item) => item.name)
        .filter((name) => name && !existingNpcNames.has(name));
      nextSettings.personalityProfile = applyPersonalityTurn(
        settings.personalityProfile,
        result,
        {
          age: nextProtagonistAge,
          settings: nextSettings,
          relationshipChanges: result.relationshipChanges || [],
        },
      );
      let newProfiles = normalizeNpcInteractionHistories(
        npcProfiles,
        relations,
        settings,
      );
      for (const profile of result.npcProfiles || []) {
        if (!profile.name) continue;
        const isNew = !newProfiles[profile.name];
        newProfiles[profile.name] = enrichNpcProfile(
          { ...newProfiles[profile.name], ...profile },
          nextProtagonistAge,
          isNew,
        );
      }
      for (const change of result.relationshipChanges || []) {
        if (change.name && !newProfiles[change.name]) {
          newProfiles[change.name] = createFallbackNpcProfile(
            change,
            nextProtagonistAge,
          );
        }
      }
      newProfiles = recordProtagonistInteractions({
        npcProfiles: newProfiles,
        previousRelations: relations,
        nextRelations,
        historicalContacts,
        changes: result.relationshipChanges || [],
        context: {
          age: nextProtagonistAge,
          title: result.title,
          event: result.event,
          summary: result.summary,
        },
      });
      const resumeUpdate = result.resumeUpdate || {};
      const resumeEntry = resumeUpdate.entry;
      const nextResume = {
        ...resume,
        currentRole: resumeUpdate.currentRole || resume.currentRole,
        organization: resumeUpdate.organization ?? resume.organization,
        employmentStatus:
          resumeUpdate.employmentStatus || resume.employmentStatus,
        education: resumeUpdate.education || resume.education,
        skills: skillTurn.available,
        experiences: resumeEntry
          ? [...(resume.experiences || []), resumeEntry].slice(-80)
          : resume.experiences || [],
      };
      const interactionNames = [
        ...(result.relationshipChanges || []).map((item) => item.name),
        ...(result.npcRelationshipChanges || []).flatMap((item) => [
          item.source,
          item.target,
        ]),
      ].filter(Boolean);
      const evolvedNetwork = evolveNpcNetwork({
        relations: nextRelations,
        npcProfiles: newProfiles,
        socialEdges: nextSocialEdges,
        historicalContacts,
        yearsPassed,
        interactionNames,
        annualUpdates: result.npcLifecycleUpdates || [],
        protagonistAge: nextProtagonistAge,
        newContactNames,
      });
      evolvedNetwork.npcProfiles = recordArchivedInteractions(
        evolvedNetwork.npcProfiles,
        evolvedNetwork.archivedNow,
        nextProtagonistAge,
      );
      const nextTurn = {
          ...blankTurn,
          ...result,
          skillsGained: skillTurn.gained,
          skillsLost: skillTurn.lost,
          skillsUsed: skillTurn.used,
          skillsAvailable: skillTurn.available,
          cashflow: financialTurn.cashflow,
          netWorthChange: financialTurn.netWorthChange,
          financialEntries: financialTurn.entries,
          approval: approvalDecision,
        },
        nextLog = {
          time: `${age}岁 · ${monthOfYear}月`,
          month: month,
          title: result.title,
          text: result.log || result.decision,
          tag: result.tag,
          event: result.event,
          thought: result.thought,
          decision: result.decision,
          reason: result.reason,
          summary: result.summary || "",
          gains: result.gains || [],
          losses: result.losses || [],
          cashflow: financialTurn.cashflow,
          netWorthChange: financialTurn.netWorthChange,
          financialEntries: financialTurn.entries,
          roi: result.roi,
          worldChange: result.worldChange,
          skillsGained: skillTurn.gained,
          skillsLost: skillTurn.lost,
          skillsUsed: skillTurn.used,
          skillsAvailable: skillTurn.available,
          physicalStatus: result.physicalStatus || null,
          learningStatus: result.learningStatus || null,
          stateDelta: result.stateDelta || {},
          relationshipChanges: result.relationshipChanges || [],
          npcRelationshipChanges: result.npcRelationshipChanges || [],
          npcLifecycleUpdates: result.npcLifecycleUpdates || [],
          personalityUpdate: result.personalityUpdate || null,
          archivedContacts: evolvedNetwork.archivedNow.map((item) => item.name),
          resumeEntry: resumeEntry || null,
          randomEventAudit: result.randomEventAudit || null,
          outcomeAudit: result.outcomeAudit || null,
          lifeStageAudit: result.lifeStageAudit || null,
          decisionBasis: result.decisionBasis || null,
          approval: approvalDecision,
        },
        nextLogs = [...logs, nextLog];
      setState(nextState);
      setSettings(nextSettings);
      setRelations(evolvedNetwork.relations);
      setSocialEdges(evolvedNetwork.socialEdges);
      setHistoricalContacts(evolvedNetwork.historicalContacts);
      setResume(nextResume);
      setTurn(nextTurn);
      setLogs(nextLogs);
      setMonth(nextMonth);
      setNpcProfiles(evolvedNetwork.npcProfiles);
      const snapshot = {
        month: nextMonth,
        state: nextState,
        relations: evolvedNetwork.relations,
        turn: nextTurn,
        settings: nextSettings,
        logs: nextLogs,
        npcProfiles: evolvedNetwork.npcProfiles,
        socialEdges: evolvedNetwork.socialEdges,
        historicalContacts: evolvedNetwork.historicalContacts,
        resume: nextResume,
      };
      setHistory((h) => {
        const next = [...h, snapshot];
        setPlaybackIndex(next.length);
        return next;
      });
      localStorage.setItem(
        "life_saved_game",
        JSON.stringify({
          version: SIMULATION_CONFIG.saveVersion,
          ...snapshot,
          history: [...history, snapshot],
        }),
      );
      setHasSave(true);
    } catch (e) {
      setError(e.message || "推演失败，请检查 API Key 与网络。");
      setAutoPlay(false);
    } finally {
      setSimulating(false);
    }
  };
  const resolveApproval = (option, autoSelected) => {
    const resolve = approvalResolverRef.current;
    if (!resolve || !option) return;
    approvalResolverRef.current = null;
    resolve({
      requestTitle: pendingApproval?.title || "临时人生分岔",
      option,
      autoSelected,
    });
    setPendingApproval(null);
  };
  const finishLife = async () => {
    setSummaryOpen(true);
    setSummaryLoading(true);
    setSummaryError("");
    try {
      const result = await callLifeSummary(
        {
          apiKey,
          endpoint: localStorage.getItem(LLM_STORAGE_KEYS.endpoint) || endpoint,
          model: localStorage.getItem(LLM_STORAGE_KEYS.model) || model,
        },
        { settings, state, relations, logs, month },
      );
      setSummary(result);
    } catch (e) {
      setSummaryError(e.message || "人生总结生成失败");
    } finally {
      setSummaryLoading(false);
    }
  };
  const randomizeProfile = async () => {
    setProfileGenerating(true);
    setError("");
    try {
      const bio = await generateCharacterProfile(
        {
          apiKey,
          endpoint: localStorage.getItem(LLM_STORAGE_KEYS.endpoint) || endpoint,
          model: localStorage.getItem(LLM_STORAGE_KEYS.model) || model,
        },
        settings,
      );
      setSettings((current) => {
        const nextSettings = {
          ...current,
          name: bio.name || current.name,
          bio: {
            childhood: bio.childhood || "",
            school: bio.school || "",
            personality: bio.personality || "",
            hobbies: bio.hobbies || "",
            dream: bio.dream || "",
          },
        };
        return {
          ...nextSettings,
          personalityProfile: createInitialPersonalityProfile(nextSettings),
        };
      });
    } catch (e) {
      setError(e.message || "人物生成失败");
    } finally {
      setProfileGenerating(false);
    }
  };
  const randomizeParents = async () => {
    setParentGenerating(true);
    setError("");
    try {
      const result = await generateParentProfiles(
        {
          apiKey,
          endpoint: localStorage.getItem(LLM_STORAGE_KEYS.endpoint) || endpoint,
          model: localStorage.getItem(LLM_STORAGE_KEYS.model) || model,
        },
        settings,
      );
      if (!Array.isArray(result.parents) || result.parents.length < 2) {
        throw new Error("模型返回的父母档案不完整");
      }
      const parents = result.parents.slice(0, 2).map((parent, index) => ({
        ...parentsForFamily(settings.family)[index],
        ...parent,
        name: index === 0 ? "父亲" : "母亲",
        age: Math.min(
          100,
          Math.max(
            settings.startAge + 16,
            Number(parent.age) || parentsForFamily(settings.family)[index].age,
          ),
        ),
        relationToProtagonist: index === 0 ? "父亲" : "母亲",
        emoji: parent.emoji || (index === 0 ? "👨🏻" : "👩🏻"),
      }));
      setSettings((current) => ({ ...current, parents }));
    } catch (e) {
      setError(e.message || "父母档案生成失败");
    } finally {
      setParentGenerating(false);
    }
  };
  const loadSavedGame = () => {
    try {
      const save = JSON.parse(localStorage.getItem("life_saved_game"));
      const npcData = removeLegacyFixedContact({
        relations: save.relations || INITIAL_RELATIONS,
        npcProfiles: {
          ...createInitialNpcProfiles(save.settings),
          ...(save.npcProfiles || {}),
        },
        socialEdges: save.socialEdges || INITIAL_SOCIAL_EDGES,
        historicalContacts: save.historicalContacts || [],
      });
      const savedSettings = normalizeSettings(save.settings);
      const savedNpcProfiles = normalizeNpcInteractionHistories(
        npcData.npcProfiles,
        npcData.relations,
        savedSettings,
      );
      setSettings(savedSettings);
      setState(normalizeFinancialState(save.state, savedSettings.initialCash));
      setRelations(npcData.relations);
      setTurn(save.turn);
      setLogs(save.logs || [createPrologueLog(save.settings)]);
      setMonth(save.month);
      setNpcProfiles(savedNpcProfiles);
      setSocialEdges(npcData.socialEdges);
      setHistoricalContacts(npcData.historicalContacts);
      setResume(normalizeResume(save.resume, save.settings || settings));
      setHistory(save.history || []);
      setPlaybackIndex((save.history || []).length);
      setStarted(true);
    } catch {
      localStorage.removeItem("life_saved_game");
      setHasSave(false);
    }
  };
  const importJson = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.settings || !data.state) throw new Error("格式不正确");
        const npcData = removeLegacyFixedContact({
          relations: data.relations || INITIAL_RELATIONS,
          npcProfiles: {
            ...createInitialNpcProfiles(data.settings),
            ...(data.npcProfiles || {}),
          },
          socialEdges: data.socialEdges || INITIAL_SOCIAL_EDGES,
          historicalContacts: data.historicalContacts || [],
        });
        const importedSettings = normalizeSettings(data.settings);
        const importedNpcProfiles = normalizeNpcInteractionHistories(
          npcData.npcProfiles,
          npcData.relations,
          importedSettings,
        );
        const importedState = normalizeFinancialState(
          data.state,
          importedSettings.initialCash,
        );
        setSettings(importedSettings);
        setState(importedState);
        setRelations(npcData.relations);
        setNpcProfiles(importedNpcProfiles);
        setSocialEdges(npcData.socialEdges);
        setHistoricalContacts(npcData.historicalContacts);
        setResume(normalizeResume(data.resume, data.settings));
        setTurn(data.turn || blankTurn);
        setLogs(data.logs || [createPrologueLog(data.settings)]);
        setMonth(data.month || 0);
        setHistory(data.history || []);
        setPlaybackIndex((data.history || []).length);
        setStarted(true);
        setSetupOpen(false);
        localStorage.setItem(
          "life_saved_game",
          JSON.stringify({
            ...data,
            version: SIMULATION_CONFIG.saveVersion,
            settings: importedSettings,
            state: importedState,
          }),
        );
        setHasSave(true);
      } catch (err) {
        setError("导入失败：" + (err.message || "文件格式错误"));
      }
    };
    reader.readAsText(file);
  };
  const exportJson = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            version: SIMULATION_CONFIG.saveVersion,
            exportedAt: new Date().toISOString(),
            settings,
            state,
            relations,
            npcProfiles,
            socialEdges,
            historicalContacts,
            resume,
            turn,
            logs,
            history,
            month,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const a = document.createElement("a");
    a.download = `${settings.name}-人生模拟-${month}个月.json`;
    a.href = URL.createObjectURL(blob);
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const seekPlayback = (index) => {
    const i = Number(index);
    setAutoPlay(false);
    setPlaybackIndex(i);
    if (i === 0) {
      setMonth(0);
      setState(createInitialState(settings.initialCash));
      setRelations(INITIAL_RELATIONS);
      setSocialEdges(INITIAL_SOCIAL_EDGES);
      setHistoricalContacts([]);
      setResume(createInitialResume(settings));
      setNpcProfiles(
        normalizeNpcInteractionHistories(
          createInitialNpcProfiles(settings),
          INITIAL_RELATIONS,
          settings,
        ),
      );
      setTurn(blankTurn);
      setLogs([createPrologueLog(settings)]);
      return;
    }
    const s = history[i - 1];
    if (s) {
      const snapshotSettings = normalizeSettings(s.settings || settings);
      setMonth(s.month);
      setState(normalizeFinancialState(s.state, snapshotSettings.initialCash));
      setRelations(s.relations);
      setNpcProfiles(
        normalizeNpcInteractionHistories(
          s.npcProfiles || {},
          s.relations || [],
          snapshotSettings,
        ),
      );
      setSocialEdges(s.socialEdges || INITIAL_SOCIAL_EDGES);
      setHistoricalContacts(s.historicalContacts || []);
      setResume(normalizeResume(s.resume, snapshotSettings));
      setTurn(s.turn);
      setSettings(snapshotSettings);
      setLogs(s.logs);
    }
  };
  const restartFromPlayback = () => {
    const kept = history.slice(0, playbackIndex);
    setHistory(kept);
    setAutoPlay(false);
    localStorage.setItem(
      "life_saved_game",
      JSON.stringify({
        version: SIMULATION_CONFIG.saveVersion,
        month,
        state,
        relations,
        socialEdges,
        historicalContacts,
        npcProfiles,
        resume,
        turn,
        settings,
        logs,
        history: kept,
      }),
    );
  };
  useEffect(() => {
    if (!autoPlay || !started || simulating) return;
    if (age >= settings.endAge) {
      setAutoPlay(false);
      finishLife();
      return;
    }
    if (playbackIndex < history.length) return;
    const textLen =
      (turn.event || "").length +
      (turn.thought || "").length +
      (turn.decision || "").length;
    const delay = Math.min(8000, Math.max(3500, textLen * 35));
    const timer = setTimeout(() => simulate(), delay);
    return () => clearTimeout(timer);
  }, [autoPlay, started, simulating, month, playbackIndex, history.length]);
  const reset = () => {
    setStarted(false);
    setMonth(0);
    setState(createInitialState(settings.initialCash));
    setRelations(INITIAL_RELATIONS);
    setSocialEdges(INITIAL_SOCIAL_EDGES);
    setHistoricalContacts([]);
    setNpcProfiles(
      normalizeNpcInteractionHistories(
        createInitialNpcProfiles(settings),
        INITIAL_RELATIONS,
        settings,
      ),
    );
    setResume(createInitialResume(settings));
    setTurn(blankTurn);
    setLogs([createPrologueLog(settings)]);
    setSummary(null);
    setSummaryError("");
    setHistory([]);
    setPlaybackIndex(0);
    setAutoPlay(false);
    setSetupOpen(true);
  };

  if (!started)
    return (
      <div className="landing">
        <nav>
          <Logo />
          <div className="nav-actions">
            <button className="nav-link" onClick={() => setPlanOpen(true)}>
              <Network size={16} /> 架构图
            </button>
            <button className="nav-link" onClick={() => setKeyOpen(true)}>
              <KeyRound size={16} /> {apiKey ? "LLM 已连接" : "连接 LLM"}
            </button>
          </div>
        </nav>
        <main className="hero">
          <img
            src="/assets/life-crossroads.png"
            alt="人生分岔口 low-poly 城市场景"
          />
          <div className="hero-shade" />
          <div className="hero-copy">
            <div className="eyebrow">
              <Sparkles size={14} /> 全 LLM 驱动的人生社会模拟器
            </div>
            <h1>
              人生没有
              <br />
              <em>预设选项</em>
            </h1>
            <p>
              世界每年重写，事件每月生成。
              <br />
              你只施加引导，角色自己下注，概率记住一切。
            </p>
            <div className="hero-buttons">
              <button
                className="primary jumbo"
                onClick={() => setSetupOpen(true)}
              >
                <Play size={18} fill="currentColor" /> 初始化宇宙
              </button>
              <button className="glass-btn" onClick={() => setPlanOpen(true)}>
                <Network size={18} /> 查看模拟架构
              </button>
              {hasSave && (
                <button
                  className="glass-btn continue-btn"
                  onClick={loadSavedGame}
                >
                  <Save size={18} /> 继续上次人生
                </button>
              )}
            </div>
            <div className="feature-chips">
              {LANDING_FEATURES.map((feature) => {
                const FeatureIcon = LANDING_ICONS[feature.icon];
                return (
                  <span key={feature.id}>
                    <FeatureIcon />
                    {feature.label}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="hero-card">
            <div className="mini-head">
              <span>
                <Bot size={16} /> 模拟器原则
              </span>
              <small>NO SCRIPT</small>
            </div>
            <p>
              “不是从三个按钮里选人生，而是让一个人，在会变化的世界里成为他自己。”
            </p>
            <div className="mini-choice">
              <i>∞</i>
              <span>
                LLM 生成世界与行动
                <small>状态 → 概率 → 事件 → 决策 → 新状态</small>
              </span>
              <ChevronRight />
            </div>
          </div>
        </main>
        <footer>
          <span>一个持续演化的 AI 人生实验</span>
          <span>API Key 由你保管 · 不内置剧情题库</span>
        </footer>
        <SetupModal
          open={setupOpen}
          onClose={() => setSetupOpen(false)}
          onStart={() => {
            const startingSettings = {
              ...settings,
              personalityProfile: createInitialPersonalityProfile(settings),
            };
            setSettings(startingSettings);
            setResume(createInitialResume(startingSettings));
            setSocialEdges(INITIAL_SOCIAL_EDGES);
            setNpcProfiles(
              normalizeNpcInteractionHistories(
                createInitialNpcProfiles(startingSettings),
                relations,
                startingSettings,
              ),
            );
            setStarted(true);
            setSetupOpen(false);
          }}
          settings={settings}
          setSettings={setSettings}
          onGenerateProfile={randomizeProfile}
          profileGenerating={profileGenerating}
          onGenerateParents={randomizeParents}
          parentGenerating={parentGenerating}
        />
        <PlanModal open={planOpen} onClose={() => setPlanOpen(false)} />
        <KeyModal
          open={keyOpen}
          onClose={() => setKeyOpen(false)}
          apiKey={apiKey}
          setApiKey={setApiKey}
        />
      </div>
    );

  return (
    <div className="game-shell">
      <header>
        <Logo />
        <div className="age-pill">
          <CalendarDays size={16} />
          <b>{age} 岁</b>
          <span>
            第 {playbackIndex} 轮 · 累计 {month} 月
          </span>
        </div>
        <div className="top-actions">
          <button
            className="nav-link finish-link"
            onClick={finishLife}
            disabled={simulating || month === 0}
          >
            <Flag size={16} /> 结束并总结
          </button>
          <button className="nav-link" onClick={() => setPlanOpen(true)}>
            <Network size={16} /> 模拟架构
          </button>
          <button className="nav-link" onClick={() => setKeyOpen(true)}>
            <Bot size={16} />
            <i className={apiKey ? "online" : ""} />
            {apiKey ? "LLM 在线" : "未连接"}
          </button>
          <IconButton onClick={reset}>
            <RefreshCcw size={17} />
          </IconButton>
        </div>
      </header>
      <div className="mobile-overview" aria-label="人物快捷状态">
        <button onClick={() => setMobileSheet("person")}>
          <span className="mobile-overview-avatar">
            {avatarFor(age, settings.gender)}
          </span>
          <span>
            <b>{settings.name}</b>
            <small>
              {age}岁 · 健康 {state.health}
            </small>
          </span>
        </button>
        <button onClick={() => setMobileSheet("finance")}>
          <WalletCards size={18} />
          <span>
            <b>{formatWorldMoney(netWorth, settings.world)}</b>
            <small>净资产</small>
          </span>
        </button>
        <button onClick={() => setMobileSheet("relations")}>
          <UsersRound size={18} />
          <span>
            <b>{relations.length} 人</b>
            <small>关系网络</small>
          </span>
        </button>
      </div>
      <div className="dashboard">
        <LeftPanel
          age={age}
          settings={settings}
          state={state}
          profileExpanded={profileExpanded}
          setProfileExpanded={setProfileExpanded}
          onEdit={() => setSetupOpen(true)}
          onOpenProfile={() => setProfileDetailOpen(true)}
        />
        <main className="story-panel">
          <div className="story-top">
            <div>
              <span className="live-dot" /> LIFE LOG · 模拟记忆
            </div>
            <button onClick={() => setHistoryOpen(true)}>
              <Menu size={17} /> 完整上下文
            </button>
          </div>
          <div className="timeline">
            {logs.slice(-4).map((l, i) => {
              const realIdx = logs.length - 4 + i;
              const isOpen = expandedLog === realIdx;
              return (
                <div
                  className={"log-item" + (isOpen ? " expanded" : "")}
                  key={i}
                  title={l.text}
                  onClick={() => setExpandedLog(isOpen ? null : realIdx)}
                >
                  <span>{l.time}</span>
                  <i />
                  <div>
                    <b>{l.title}</b>
                    <p>{l.text}</p>
                    {isOpen && l.event && l.event !== l.text && (
                      <div className="log-expand">
                        {l.event && <p className="log-event">{l.event}</p>}
                        {l.thought && (
                          <p className="log-thought">💭 {l.thought}</p>
                        )}
                        {l.decision && l.decision !== "尚未做出决定" && (
                          <p className="log-decision">⚡ {l.decision}</p>
                        )}
                      </div>
                    )}
                    <span className="log-expand-hint">
                      {isOpen ? "收起" : "展开"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <EventCard
            settings={settings}
            age={age}
            turn={turn}
            logs={logs}
            simulating={simulating}
            eventExpanded={eventExpanded}
            setEventExpanded={setEventExpanded}
            error={error}
            autoPlay={autoPlay}
            avatar={avatarFor(age, settings.gender)}
          />
        </main>
        <RightPanel
          turn={turn}
          age={age}
          state={state}
          netWorth={netWorth}
          simulating={simulating}
          rightTab={rightTab}
          setRightTab={setRightTab}
          relations={relations}
          setSelectedNpcName={setSelectedNpcName}
          historicalContacts={historicalContacts}
          setRelGraphOpen={setRelGraphOpen}
          milestones={milestones}
          setMilestoneDetail={setMilestoneDetail}
          world={settings.world}
          onOpenLedger={() => setAssetLedgerOpen(true)}
        />
      </div>
      <MobileSheet
        mobileSheet={mobileSheet}
        setMobileSheet={setMobileSheet}
        state={state}
        turn={turn}
        settings={settings}
        netWorth={netWorth}
        relations={relations}
        setSelectedNpcName={setSelectedNpcName}
        historicalContacts={historicalContacts}
        setRelGraphOpen={setRelGraphOpen}
        onOpenLedger={() => {
          setMobileSheet(null);
          setAssetLedgerOpen(true);
        }}
      />
      <BottomPlayer
        autoPlay={autoPlay}
        setAutoPlay={setAutoPlay}
        playbackIndex={playbackIndex}
        history={history}
        simulating={simulating}
        simulate={simulate}
        settings={settings}
        age={age}
        monthOfYear={monthOfYear}
        month={month}
        seekPlayback={seekPlayback}
        restartFromPlayback={restartFromPlayback}
        exportJson={exportJson}
        importJson={importJson}
      />
      {historyOpen && (
        <HistoryModal
          historyLogs={logs}
          month={month}
          onClose={() => setHistoryOpen(false)}
        />
      )}
      {relGraphOpen && (
        <RelationshipGraphModal
          relations={relations}
          settings={settings}
          npcProfiles={npcProfiles}
          socialEdges={socialEdges}
          historicalContacts={historicalContacts}
          initialName={selectedNpcName}
          onClose={() => setRelGraphOpen(false)}
        />
      )}
      {milestoneDetail && (
        <div
          className="modal-backdrop"
          onClick={() => setMilestoneDetail(null)}
        >
          <div
            className="modal milestone-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <IconButton
              onClick={() => setMilestoneDetail(null)}
              className="modal-close-btn"
            >
              <X size={18} />
            </IconButton>
            <div className="modal-title">
              <span>{milestoneDetail.time}</span>
              <b>{milestoneDetail.title}</b>
            </div>
            {milestoneDetail.tag && (
              <span className="ms-tag">{milestoneDetail.tag}</span>
            )}
            <p className="ms-text">{milestoneDetail.text}</p>
            {milestoneDetail.event &&
              milestoneDetail.event !== milestoneDetail.text && (
                <div className="ms-block">
                  <b>事件详情</b>
                  <p>{milestoneDetail.event}</p>
                </div>
              )}
            {milestoneDetail.thought && (
              <div className="ms-block thought">
                <b>主角想法</b>
                <p>{milestoneDetail.thought}</p>
              </div>
            )}
            {milestoneDetail.decision &&
              milestoneDetail.decision !== "尚未做出决定" && (
                <div className="ms-block decision">
                  <b>决定</b>
                  <p>{milestoneDetail.decision}</p>
                  {milestoneDetail.reason && (
                    <small>理由：{milestoneDetail.reason}</small>
                  )}
                </div>
              )}
            {milestoneDetail.cashflow !== undefined &&
              milestoneDetail.cashflow !== 0 && (
                <div className="ms-cashflow">
                  <span>现金流</span>
                  <b
                    className={
                      milestoneDetail.cashflow >= 0 ? "positive" : "negative"
                    }
                  >
                    {milestoneDetail.cashflow >= 0 ? "+" : ""}¥
                    {money(milestoneDetail.cashflow)}
                  </b>
                </div>
              )}
          </div>
        </div>
      )}
      <SetupModal
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        onStart={() => setSetupOpen(false)}
        settings={settings}
        setSettings={setSettings}
        onGenerateProfile={randomizeProfile}
        profileGenerating={profileGenerating}
        onGenerateParents={randomizeParents}
        parentGenerating={parentGenerating}
      />
      <PlanModal open={planOpen} onClose={() => setPlanOpen(false)} />
      <KeyModal
        open={keyOpen}
        onClose={() => setKeyOpen(false)}
        apiKey={apiKey}
        setApiKey={setApiKey}
        endpoint={endpoint}
        setEndpoint={setEndpoint}
        model={model}
        setModel={setModel}
      />
      <SummaryModal
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        summary={summary}
        loading={summaryLoading}
        error={summaryError}
        onExport={exportLifePoster}
        age={age}
        state={state}
        settings={settings}
        logs={logs}
      />
      <ApprovalRequest request={pendingApproval} onResolve={resolveApproval} />
      <ProfileDetailModal
        open={profileDetailOpen}
        onClose={() => setProfileDetailOpen(false)}
        settings={settings}
        age={age}
        state={state}
        resume={resume}
        logs={logs}
      />
      <AssetLedgerModal
        open={assetLedgerOpen}
        onClose={() => setAssetLedgerOpen(false)}
        state={state}
        world={settings.world}
      />
    </div>
  );
}
