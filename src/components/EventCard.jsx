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

function SimulationProgress({ settings, trace, phase }) {
  const beats = trace?.beats || [];
  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    setVisibleCount(1);
  }, [trace]);

  useEffect(() => {
    if (!beats.length || visibleCount >= beats.length) return undefined;
    const timer = window.setTimeout(
      () => setVisibleCount((count) => Math.min(count + 1, beats.length)),
      1500,
    );
    return () => window.clearTimeout(timer);
  }, [beats.length, visibleCount]);

  const visibleBeats = beats.slice(0, visibleCount);
  const people = visibleBeats
    .flatMap((beat) => beat.people || [])
    .filter(
      (person, index, list) =>
        person?.name &&
        list.findIndex((candidate) => candidate.name === person.name) === index,
    );

  return (
    <div className="life-unfolding" aria-live="polite">
      <header className="life-unfolding-head">
        <span className="simulation-live-dot" />
        <div>
          <b>这一段人生正在展开</b>
          <small>
            {phase === "reading"
              ? `正在回看${settings.name}走过的路，寻找这段生活的开场…`
              : "下面是模型刚刚推演出的过程，最终结果会沿着它继续发生。"}
          </small>
        </div>
      </header>

      {!beats.length ? (
        <div className="life-unfolding-wait">
          <i />
          <p>
            <b>故事还在酝酿</b>
            <span>第一个具体变化出现后，会立刻写在这里。</span>
          </p>
        </div>
      ) : (
        <>
          <p className="life-unfolding-opening">“{trace.opening}”</p>
          <div className="life-unfolding-story">
            {visibleBeats.map((beat, index) => (
              <article
                className={index === visibleBeats.length - 1 ? "current" : ""}
                key={`${beat.phase}-${index}`}
              >
                <i>{index + 1}</i>
                <div>
                  <span>{beat.phase}</span>
                  <p>{beat.text}</p>
                  {!!beat.people?.length && (
                    <div className="life-beat-people">
                      {beat.people.map((person, personIndex) => (
                        <small key={`${person.name}-${personIndex}`}>
                          {person.change || "遇见"} <b>{person.name}</b>
                          {person.relation ? ` · ${person.relation}` : ""}
                        </small>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
          {!!people.length && (
            <footer className="life-unfolding-people">
              <span>这段人生里出现的人</span>
              <div>
                {people.map((person) => (
                  <small key={person.name}>
                    <b>{person.name}</b>
                    {person.relation ? ` · ${person.relation}` : ""}
                    {person.change ? ` · ${person.change}` : ""}
                  </small>
                ))}
              </div>
            </footer>
          )}
        </>
      )}
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
  simulationTrace,
  simulationPhase,
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
          {simulating ? "生活正在向前走…" : turn.decision || "等待世界运转"}
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
        <h2>{simulating ? "下一段人生正在发生…" : turn.title}</h2>

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
                {turn.intimacySummary && (
                  <span>情感 · {turn.intimacySummary}</span>
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
            trace={simulationTrace}
            phase={simulationPhase}
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
