import React, { useEffect, useState } from "react";
import { ChevronRight, Sparkles } from "lucide-react";
import { formatWorldMoney } from "../simulation/probabilityModel";
import { normalizeSkills } from "../simulation/skillModel";

const money = (value) =>
  new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 }).format(value);

function TagGroup({ label, tone, items, prefix = "" }) {
  if (!items?.length) return null;
  return (
    <div className="stage-tag-group">
      <b>{label}</b>
      <div>
        {items.slice(0, 8).map((item, index) => (
          <span className={`stage-tag ${tone}`} key={`${item}-${index}`}>
            {prefix}
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function StatusCard({ icon, title, status, detail, tone }) {
  return (
    <div className={`stage-status-card ${tone}`}>
      <span>{icon}</span>
      <div>
        <small>{title}</small>
        <b>{status}</b>
        <p>{detail}</p>
      </div>
    </div>
  );
}

const LOADING_AGENTS = [
  {
    name: "世界 Agent",
    task: "读取时代、城市与当前处境",
    detail: "正在筛选这段时间里真正可能发生的事件",
  },
  {
    name: "记忆 Agent",
    task: "回看关键节点与人物经历",
    detail: "让新的选择继承过去，而不是重写人设",
  },
  {
    name: "关系 Agent",
    task: "检查现有关系与相遇机会",
    detail: "评估谁会靠近、疏远，或第一次出现",
  },
  {
    name: "决策 Agent",
    task: "依据性格生成自主行动",
    detail: "正在权衡欲望、风险、能力与现实限制",
  },
  {
    name: "结算 Agent",
    task: "核对概率、资产与状态变化",
    detail: "确保结果可结算，并写入长期人生记忆",
  },
];

function SimulationProgress({ settings, age, logs, relations, milestones }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setElapsed(0);
    const timer = window.setInterval(
      () => setElapsed((value) => value + 1),
      1400,
    );
    return () => window.clearInterval(timer);
  }, []);

  const activeAgent = Math.min(elapsed, LOADING_AGENTS.length - 1);
  const progress = Math.min(90, (activeAgent + 1) * 18);
  const recentNodes = (milestones?.length ? milestones : logs || [])
    .filter((item) => item?.title && item.title !== "等待世界运转")
    .slice(-3)
    .reverse();
  const knownPeople = (relations || []).slice(0, 5);
  const stage =
    age < 18
      ? "成长与求学"
      : age < 25
        ? "成年初期"
        : age < 45
          ? "事业与关系发展"
          : age < 60
            ? "人生中段"
            : "晚年生活";

  return (
    <div className="simulation-progress" aria-live="polite">
      <div className="simulation-progress-head">
        <div>
          <span className="simulation-live-dot" />
          <b>人生推演进行中</b>
          <small>
            已等待约{" "}
            {elapsed * 1.4 < 10
              ? Math.round(elapsed * 1.4)
              : Math.round((elapsed * 1.4) / 5) * 5}{" "}
            秒
          </small>
        </div>
        <strong>
          阶段 {activeAgent + 1}/{LOADING_AGENTS.length}
        </strong>
      </div>
      <div className="simulation-progress-track">
        <i style={{ width: `${progress}%` }} />
      </div>

      <section className="simulation-thought-summary">
        <span>模型分析摘要</span>
        <p>
          正在把 <b>{settings.name}</b> 的{stage}、{settings.monthsPerTurn}
          个月时间跨度、既往经历与关系网络放进同一个现实约束中，寻找最符合此人性格的下一步。
        </p>
        <small>这是可公开的任务摘要，不展示模型隐藏推理。</small>
      </section>

      <div className="simulation-agents">
        {LOADING_AGENTS.map((agent, index) => (
          <div
            className={`simulation-agent ${index < activeAgent ? "done" : ""} ${index === activeAgent ? "active" : ""}`}
            key={agent.name}
          >
            <i>
              {index < activeAgent
                ? "✓"
                : index === activeAgent
                  ? "●"
                  : index + 1}
            </i>
            <span>
              <b>{agent.name}</b>
              <em>{agent.task}</em>
              {index === activeAgent && <small>{agent.detail}</small>}
            </span>
          </div>
        ))}
      </div>

      <div className="simulation-context-grid">
        <section>
          <span>人物关键节点</span>
          {recentNodes.length ? (
            recentNodes.map((node, index) => (
              <div
                className="simulation-context-item"
                key={`${node.title}-${index}`}
              >
                <i />
                <p>
                  <b>{node.title}</b>
                  <small>{node.time || "既往经历"}</small>
                </p>
              </div>
            ))
          ) : (
            <p className="simulation-context-empty">
              人生刚刚开始，正在生成第一个关键节点。
            </p>
          )}
        </section>
        <section>
          <span>已经结识的人</span>
          {knownPeople.length ? (
            <div className="simulation-people">
              {knownPeople.map((person, index) => (
                <div key={`${person.name}-${index}`}>
                  <i>{person.emoji || "○"}</i>
                  <p>
                    <b>{person.name}</b>
                    <small>{person.status || "已有联系"}</small>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="simulation-context-empty">
              关系 Agent 正在寻找可能的新相遇。
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

export default function EventCard({
  settings,
  age,
  turn,
  logs,
  simulating,
  eventExpanded,
  setEventExpanded,
  error,
  autoPlay,
  avatar,
  relations,
  milestones,
}) {
  const historicalSkills = normalizeSkills(
    (logs || []).flatMap((entry) => entry.skillsGained || []),
  );
  const availableSkills = normalizeSkills(
    Array.isArray(turn.skillsAvailable)
      ? turn.skillsAvailable
      : [...historicalSkills, ...(turn.skillsGained || [])],
  );
  const gainedSkills = normalizeSkills(turn.skillsGained || []);
  const lostSkills = normalizeSkills(turn.skillsLost || []);
  const usedSkills = normalizeSkills(turn.skillsUsed || []);
  const intro =
    turn.summary ||
    turn.log ||
    (turn.event?.length > 120 ? `${turn.event.slice(0, 120)}…` : turn.event);
  const physical = turn.physicalStatus || {
    label: "状态稳定",
    detail: `健康值 ${turn.health ?? "暂无明显变化"}`,
  };
  const learning = turn.learningStatus || {
    stage: age < 6 ? "成长启蒙" : age < 18 ? "在校学习" : "持续学习",
    label: "暂无变化",
    detail: "本阶段没有明确记录新的学习进展。",
  };

  return (
    <section className="event-card">
      <div className="event-art">
        <div className={`life-character ${simulating ? "walking" : "idle"}`}>
          <span>{avatar}</span>
          <i />
        </div>
        <div className="activity-bubble">
          {simulating ? "正在经历这段时间…" : turn.decision || "等待世界运转"}
        </div>
        <div className="stage-ground">
          <span />
          <span />
          <span />
        </div>
        <div className="event-orb one" />
        <div className="event-orb two" />
      </div>

      <div className="event-body">
        <div className="event-meta">
          <span>{turn.tag}</span>
          {turn.randomEventAudit?.triggered && (
            <span className="random-event-badge">
              随机事件 · {turn.randomEventAudit.category}
            </span>
          )}
          {turn.outcomeAudit?.label && (
            <span
              className={`outcome-audit-badge ${turn.outcomeAudit.direction || "mixed"}`}
            >
              世界结算 · {turn.outcomeAudit.label}
            </span>
          )}
          {turn.lifeStageAudit?.triggered && (
            <span className="life-stage-badge">
              年龄处境 ·{" "}
              {turn.lifeStageAudit.events
                .map((item) => item.label)
                .slice(0, 2)
                .join("、")}
            </span>
          )}
          <small>
            {age}岁 · {settings.monthsPerTurn}个月概览 · {turn.rarity || "日常"}
            {turn.eventProbability != null
              ? ` ${(turn.eventProbability * 100).toFixed(
                  turn.eventProbability < 0.001 ? 4 : 2,
                )}%`
              : ""}
          </small>
        </div>
        <h2>{simulating ? "世界正在生成…" : turn.title}</h2>

        {!simulating && turn.title && (
          <>
            <div className="stage-overview">
              {intro && <p className="stage-intro">{intro}</p>}

              {turn.approval && (
                <div className="stage-approval-result">
                  <span>AGENT APPROVED</span>
                  <div>
                    <b>{turn.approval.option?.label}</b>
                    <small>
                      {turn.approval.autoSelected
                        ? "50 秒未响应，已自动采用推荐方案"
                        : "由用户批准后继续执行"}
                    </small>
                  </div>
                </div>
              )}

              <div className="stage-tag-sections">
                <TagGroup
                  label="本轮学会"
                  tone="skill-new"
                  items={gainedSkills}
                  prefix="＋"
                />
                <TagGroup
                  label="技能失效"
                  tone="loss"
                  items={lostSkills}
                  prefix="−"
                />
                <TagGroup
                  label="当前可用技能"
                  tone="skill-ready"
                  items={availableSkills}
                />
                <TagGroup
                  label="本轮使用"
                  tone="skill-used"
                  items={usedSkills}
                />
                <TagGroup
                  label="失去"
                  tone="loss"
                  items={turn.losses || []}
                  prefix="−"
                />
                <TagGroup
                  label="其他收获"
                  tone="gain"
                  items={turn.gains || []}
                  prefix="＋"
                />
              </div>

              <div className="stage-status-grid">
                <StatusCard
                  icon="♡"
                  title="身体状况"
                  status={physical.label || "状态稳定"}
                  detail={physical.detail || "暂无明显身体异常"}
                  tone="physical"
                />
                <StatusCard
                  icon="◎"
                  title={learning.stage || "学习状况"}
                  status={learning.label || "暂无变化"}
                  detail={learning.detail || "本阶段没有明确学习记录"}
                  tone="learning"
                />
              </div>

              <div className="stage-foot-tags">
                {turn.cashflow !== 0 && turn.cashflow !== undefined && (
                  <span
                    className={turn.cashflow >= 0 ? "positive" : "negative"}
                  >
                    现金流 {turn.cashflow >= 0 ? "+" : ""}
                    {formatWorldMoney(turn.cashflow, settings.world)}
                  </span>
                )}
                {(turn.relationshipSummary ||
                  turn.relationshipChanges?.length > 0) && (
                  <span>
                    关系 ·{" "}
                    {turn.relationshipSummary ||
                      turn.relationshipChanges
                        .map(
                          (change) =>
                            `${change.name}${change.delta >= 0 ? "+" : ""}${change.delta}`,
                        )
                        .join("、")}
                  </span>
                )}
              </div>
            </div>

            {turn.worldChange && (
              <div className="annual-report">
                <Sparkles size={16} />
                <span>
                  <b>年度变化</b>
                  {turn.worldChange}
                </span>
              </div>
            )}

            <button
              className="expand-toggle"
              onClick={() => setEventExpanded(!eventExpanded)}
            >
              {eventExpanded ? "收起详情" : "展开详情"}
              <ChevronRight
                size={14}
                style={{ transform: eventExpanded ? "rotate(90deg)" : "" }}
              />
            </button>

            {eventExpanded && (
              <div className="event-details">
                {turn.event && (
                  <div className="detail-block">
                    <b>事件经过</b>
                    <p>{turn.event}</p>
                  </div>
                )}
                {turn.thought && (
                  <div className="detail-block thought">
                    <b>内心想法</b>
                    <p>{turn.thought}</p>
                  </div>
                )}
                {turn.decision && turn.decision !== "尚未做出决定" && (
                  <div className="detail-block decision">
                    <b>决定</b>
                    <p>{turn.decision}</p>
                    {turn.reason && <small>理由：{turn.reason}</small>}
                  </div>
                )}
                {turn.decisionBasis && (
                  <div className="detail-block decision-basis">
                    <b>人物决策依据</b>
                    <div>
                      {[
                        ["性格", turn.decisionBasis.acceptedPersonality],
                        ["年龄", turn.decisionBasis.ageDrive],
                        ["性别处境", turn.decisionBasis.genderContext],
                        ["过往", turn.decisionBasis.memoryInfluence],
                        ["非理性驱动", turn.decisionBasis.nonRationalDrive],
                      ]
                        .filter(([, value]) => value && value !== "无")
                        .map(([label, value]) => (
                          <span key={label}>
                            <small>{label}</small>
                            {value}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
                <div className="detail-meta">
                  {turn.roi && turn.roi !== "—" && (
                    <span>回报：{turn.roi}</span>
                  )}
                  {(turn.toolsUsed || []).length > 0 && (
                    <span>工具：{turn.toolsUsed.join("、")}</span>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {simulating && (
          <SimulationProgress
            settings={settings}
            age={age}
            logs={logs}
            relations={relations}
            milestones={milestones}
          />
        )}
        {error && <div className="sim-error">{error}</div>}
        {autoPlay && !simulating && turn.title && (
          <div className="autoplay-indicator">
            <span>自动播放中，正在阅读结果…</span>
            <i>
              <em />
            </i>
          </div>
        )}
      </div>
    </section>
  );
}
