import React, { useMemo, useState } from "react";
import {
  Archive,
  Brain,
  ChevronRight,
  List,
  Network,
  ReceiptText,
  Search,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { getCurrentActivity } from "../data/gameState";
import {
  currencyForWorld,
  formatWorldMoney,
} from "../simulation/probabilityModel";
import DirectionChoices from "./DirectionChoices";

const relationSearchText = (relation) =>
  [
    relation.name,
    relation.status,
    relation.action,
    relation.personality,
    relation.familiarity,
    relation.archivedReason,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();

export default function RightPanel({
  turn,
  age,
  state,
  netWorth,
  simulating,
  rightTab,
  setRightTab,
  relations,
  historicalContacts = [],
  setSelectedNpcName,
  setRelGraphOpen,
  milestones,
  setMilestoneDetail,
  world,
  onOpenLedger,
  directionField,
  onSelectDirection,
  outcomePreview,
}) {
  const currency = currencyForWorld(world);
  const netWorthChange = Number(turn.netWorthChange ?? turn.cashflow) || 0;
  const ChangeIcon = netWorthChange >= 0 ? TrendingUp : TrendingDown;
  const [contactView, setContactView] = useState("active");
  const [relationQuery, setRelationQuery] = useState("");
  const [compactRelations, setCompactRelations] = useState(true);
  const normalizedRelationQuery = relationQuery.trim().toLocaleLowerCase();
  const visibleRelations = useMemo(
    () =>
      normalizedRelationQuery
        ? relations.filter((relation) =>
            relationSearchText(relation).includes(normalizedRelationQuery),
          )
        : relations,
    [relations, normalizedRelationQuery],
  );
  const visibleHistoricalContacts = useMemo(() => {
    const contacts = historicalContacts.slice().reverse();
    return normalizedRelationQuery
      ? contacts.filter((contact) =>
          relationSearchText(contact).includes(normalizedRelationQuery),
        )
      : contacts;
  }, [historicalContacts, normalizedRelationQuery]);
  const visibleContactCount =
    contactView === "active"
      ? visibleRelations.length
      : visibleHistoricalContacts.length;

  return (
    <aside className="right-panel compact-right">
      <div className="right-now">
        <div>
          <small>当前身份</small>
          <b>{turn.statusLabel || getCurrentActivity(turn, age).label}</b>
        </div>
        <div>
          <small>稳定月收入</small>
          <b>{formatWorldMoney(state.income || 0, world)}</b>
        </div>
        <p>
          <Brain size={13} />
          <span>
            {simulating
              ? "心里正有些新的念头…"
              : turn.thought || "暂时没有特别的想法。"}
          </span>
        </p>
      </div>

      <div className="right-tabs">
        <button
          className={rightTab === "finance" ? "active" : ""}
          onClick={() => setRightTab("finance")}
        >
          财务
        </button>
        <button
          className={rightTab === "relations" ? "active" : ""}
          onClick={() => setRightTab("relations")}
        >
          关系
        </button>
        <button
          className={rightTab === "milestones" ? "active" : ""}
          onClick={() => setRightTab("milestones")}
        >
          里程碑
        </button>
      </div>

      {rightTab === "finance" && (
        <div className="right-tab-content">
          <button className="finance-net-card" onClick={onOpenLedger}>
            <span className="finance-net-head">
              <small>净资产</small>
              <ChevronRight size={18} />
            </span>
            <b>{formatWorldMoney(netWorth, world)}</b>
            <span
              className={`finance-net-change ${
                netWorthChange >= 0 ? "up" : "down"
              }`}
            >
              <ChangeIcon size={14} />
              {netWorthChange >= 0 ? "+" : ""}
              {formatWorldMoney(netWorthChange, world)} 本轮净值
            </span>
            <small className="currency-note">
              按模拟汇率显示为{currency.unit}
            </small>
            <span className="finance-net-open">
              <ReceiptText size={15} />
              查看资产、负债与账本
            </span>
          </button>

          <DirectionChoices
            directionField={directionField}
            onSelect={onSelectDirection}
            disabled={simulating}
          />

          <div className="probability-list">
            <b>下一轮结果概率</b>
            {Object.entries(outcomePreview?.probabilities || {}).map(
              ([key, probability]) => (
              <div key={key}>
                <span>
                  {{
                    favorable: "有利",
                    mixed: "得失并存",
                    adverse: "不利",
                    stagnant: "平淡",
                  }[key] || key}
                </span>
                <i>
                  <em style={{ width: `${probability * 100}%` }} />
                </i>
                <small>{Math.round(probability * 100)}%</small>
              </div>
              ),
            )}
            <small className="probability-note">
              按正态能力标尺、时间跨度、状态、负债与世界压力计算
            </small>
          </div>
        </div>
      )}

      {rightTab === "relations" && (
        <div className="right-tab-content relations-tab-content">
          <div className="relation-browser-head">
            <div
              className="relation-view-switch"
              role="tablist"
              aria-label="联系人范围"
            >
              <button
                type="button"
                className={contactView === "active" ? "active" : ""}
                role="tab"
                aria-selected={contactView === "active"}
                onClick={() => setContactView("active")}
              >
                <Users size={14} />
                活跃
                <b>{relations.length}</b>
              </button>
              <button
                type="button"
                className={contactView === "history" ? "active" : ""}
                role="tab"
                aria-selected={contactView === "history"}
                onClick={() => setContactView("history")}
              >
                <Archive size={14} />
                历史
                <b>{historicalContacts.length}</b>
              </button>
            </div>
            <div className="relation-search-row">
              <label className="relation-search">
                <Search size={14} />
                <input
                  type="search"
                  value={relationQuery}
                  onChange={(event) => setRelationQuery(event.target.value)}
                  placeholder="搜索姓名、关系或状态"
                  aria-label="搜索联系人"
                />
              </label>
              <button
                type="button"
                className={`relation-density-toggle ${
                  compactRelations ? "active" : ""
                }`}
                onClick={() => setCompactRelations((current) => !current)}
                aria-pressed={compactRelations}
                title={compactRelations ? "切换到详情模式" : "切换到紧凑模式"}
              >
                <List size={15} />
                <span>{compactRelations ? "紧凑" : "详情"}</span>
              </button>
            </div>
          </div>
          <button
            className="graph-open-btn"
            onClick={() => {
              setSelectedNpcName(null);
              setRelGraphOpen(true);
            }}
          >
            <Network size={14} />
            查看关系连线图
          </button>
          <div
            className={`relation-list-shell ${
              compactRelations ? "is-compact" : "is-detailed"
            }`}
          >
            <div className="relation-list-meta">
              <span>
                {contactView === "active" ? "当前联系人" : "已淡出联系人"}
              </span>
              <small>
                {normalizedRelationQuery
                  ? `找到 ${visibleContactCount} 人`
                  : `${visibleContactCount} 人`}
              </small>
            </div>
            {contactView === "active" ? (
              <div className="relations">
                {visibleRelations.map((relation, index) => (
                  <button
                    type="button"
                    key={`${relation.name}-${index}`}
                    className="rel-row"
                    aria-label={`查看${relation.name}的关系详情`}
                    title={relation.personality}
                    onClick={() => {
                      setSelectedNpcName(relation.name);
                      setRelGraphOpen(true);
                    }}
                  >
                    <span className="face">{relation.emoji}</span>
                    <span>
                      <b>{relation.name}</b>
                      <small>
                        {relation.status} · {relation.action || "暂无本轮互动"}
                      </small>
                      <small className="rel-lifecycle-meta">
                        {relation.age ? `${relation.age}岁 · ` : ""}
                        {relation.familiarity || "关系稳定"}
                        {relation.inactiveYears > 0
                          ? ` · ${relation.inactiveYears}年未互动`
                          : ""}
                      </small>
                    </span>
                    <b className="rel-value">{relation.value}</b>
                    <ChevronRight size={13} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="relations historical-relations">
                {visibleHistoricalContacts.map((contact) => (
                  <button
                    type="button"
                    key={contact.name}
                    className="rel-row historical-rel-row"
                    aria-label={`查看${contact.name}的历史关系详情`}
                    onClick={() => {
                      setSelectedNpcName(contact.name);
                      setRelGraphOpen(true);
                    }}
                  >
                    <span className="face is-archived">
                      {contact.emoji || "○"}
                    </span>
                    <span>
                      <b>{contact.name}</b>
                      <small>{contact.archivedReason || "长期没有互动"}</small>
                      <small className="rel-lifecycle-meta">
                        {contact.archivedAtAge
                          ? `${contact.archivedAtAge}岁淡出`
                          : "仍保留人物生平与重逢可能"}
                      </small>
                    </span>
                    <ChevronRight size={13} />
                  </button>
                ))}
              </div>
            )}
            {visibleContactCount === 0 && (
              <div className="relation-list-empty">
                <Search size={18} />
                <span>
                  {normalizedRelationQuery
                    ? "没有匹配的联系人"
                    : contactView === "active"
                      ? "暂无活跃联系人"
                      : "暂无历史联系人"}
                </span>
                {normalizedRelationQuery && (
                  <button type="button" onClick={() => setRelationQuery("")}>
                    清除搜索
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {rightTab === "milestones" && (
        <div className="right-tab-content milestone-list">
          {milestones.length ? (
            milestones.map((milestone, index) => (
              <div
                key={`${milestone.title}-${index}`}
                className="milestone-item"
                onClick={() => setMilestoneDetail(milestone)}
              >
                <i />
                <span>
                  <b>{milestone.title}</b>
                  <small>{milestone.time}</small>
                </span>
                <ChevronRight size={14} />
              </div>
            ))
          ) : (
            <p>买房、结婚、毕业、创业等关键节点会出现在这里。</p>
          )}
        </div>
      )}
    </aside>
  );
}
