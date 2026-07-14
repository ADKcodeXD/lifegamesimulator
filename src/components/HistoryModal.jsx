import React, { useState } from "react";
import { CalendarDays, X } from "lucide-react";
import { IconButton } from "./Common";
import { normalizeSkills } from "../simulation/skillModel";

const money = (value) =>
  new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 }).format(
    value || 0,
  );
const skillSummary = (skills) => normalizeSkills(skills).join("、");

export default function HistoryModal({ historyLogs, month, onClose }) {
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState("all");
  const allLogs = historyLogs.filter(
    (l) =>
      l.title &&
      l.title !== "模拟已就绪" &&
      l.title !== `${historyLogs[0]?.title}`,
  );
  const filtered =
    filter === "all"
      ? allLogs
      : filter === "milestone"
        ? allLogs.filter((l) =>
            /买房|结婚|毕业|创业|生育|退休|首付|房贷|入学|升学|生子|离婚|出轨|破产|升职|辞职|出国/.test(
              l.title + (l.event || "") + (l.text || ""),
            ),
          )
        : filter === "decision"
          ? allLogs.filter((l) => l.decision && l.decision !== "尚未做出决定")
          : allLogs.filter((l) => (l.tag || "").includes(filter));
  return (
    <div className="modal-backdrop">
      <div className="modal timeline-dialog">
        <IconButton onClick={onClose} className="modal-close-btn">
          <X size={18} />
        </IconButton>
        <div className="modal-title">
          <span>人生时间线</span>
          <b>事件 · 经历 · 决策全记录</b>
        </div>
        <div className="timeline-filters">
          {[
            ["all", "全部"],
            ["milestone", "里程碑"],
            ["decision", "关键决策"],
            ["读书", "读书"],
            ["创业", "创业"],
            ["在职", "工作"],
            ["恋爱", "感情"],
          ].map(([k, label]) => (
            <button
              key={k}
              className={"tl-filter" + (filter === k ? " active" : "")}
              onClick={() => setFilter(k)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="timeline-scroll">
          {filtered.length === 0 ? (
            <div className="timeline-empty">
              <CalendarDays size={36} />
              <p>暂无记录，开始推演后将在此展示完整人生轨迹。</p>
            </div>
          ) : (
            <div className="timeline-rail">
              {filtered.map((l, i) => {
                const isOpen = expanded === i;
                const isMilestone =
                  /买房|结婚|毕业|创业|生育|退休|首付|房贷|入学|升学|生子|离婚|出轨|破产|升职|辞职|出国/.test(
                    l.title + (l.event || "") + (l.text || ""),
                  );
                return (
                  <div
                    className={
                      "tl-entry" +
                      (isOpen ? " open" : "") +
                      (isMilestone ? " milestone" : "")
                    }
                    key={i}
                    onClick={() => setExpanded(isOpen ? null : i)}
                  >
                    <div className="tl-dot-wrap">
                      <span
                        className={"tl-dot" + (isMilestone ? " star" : "")}
                      />
                      {i < filtered.length - 1 && <span className="tl-line" />}
                    </div>
                    <div className="tl-card">
                      <div className="tl-card-head">
                        <span className="tl-time">{l.time}</span>
                        {l.tag && <span className="tl-tag">{l.tag}</span>}
                        {isMilestone && (
                          <span className="tl-milestone-flag">★ 里程碑</span>
                        )}
                      </div>
                      <h4>{l.title}</h4>
                      <p className="tl-summary">{l.text}</p>
                      {isOpen && (
                        <div className="tl-details">
                          {l.event && (
                            <div className="tl-detail-block">
                              <b>事件</b>
                              <p>{l.event}</p>
                            </div>
                          )}
                          {l.thought && (
                            <div className="tl-detail-block thought">
                              <b>想法</b>
                              <p>{l.thought}</p>
                            </div>
                          )}
                          {l.decision && l.decision !== "尚未做出决定" && (
                            <div className="tl-detail-block decision">
                              <b>决定</b>
                              <p>{l.decision}</p>
                              {l.reason && <small>理由：{l.reason}</small>}
                            </div>
                          )}
                          {l.approval && (
                            <div className="tl-detail-block decision">
                              <b>人生分岔</b>
                              <p>{l.approval.option?.label}</p>
                              <small>
                                {l.approval.autoSelected
                                  ? "50 秒超时后自动采用推荐方案"
                                  : "用户主动批准"}
                              </small>
                            </div>
                          )}
                          {l.worldChange && (
                            <div className="tl-detail-block world">
                              <b>世界模型变化</b>
                              <p>{l.worldChange}</p>
                            </div>
                          )}
                          <div className="tl-meta-row">
                            {l.cashflow !== undefined && l.cashflow !== 0 && (
                              <span
                                className={
                                  l.cashflow >= 0 ? "positive" : "negative"
                                }
                              >
                                现金流 {l.cashflow >= 0 ? "+" : ""}¥
                                {money(l.cashflow)}
                              </span>
                            )}
                            {l.roi && l.roi !== "—" && (
                              <span>回报 {l.roi}</span>
                            )}
                            {skillSummary(l.skillsGained) && (
                              <span className="skills">
                                技能 +{skillSummary(l.skillsGained)}
                              </span>
                            )}
                            {skillSummary(l.skillsLost) && (
                              <span className="negative">
                                技能 −{skillSummary(l.skillsLost)}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      <span className="tl-expand-hint">
                        {isOpen ? "收起" : "展开详情"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="timeline-stats">
          <span>共 {allLogs.length} 条记录</span>
          <span>
            {
              allLogs.filter((l) =>
                /买房|结婚|毕业|创业|生育|退休|首付|房贷/.test(
                  l.title + (l.text || ""),
                ),
              ).length
            }{" "}
            个里程碑
          </span>
          <span>已推演 {month} 个月</span>
        </div>
      </div>
    </div>
  );
}
