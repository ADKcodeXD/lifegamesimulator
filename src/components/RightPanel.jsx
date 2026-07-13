import React from "react";
import {
  Brain,
  ChevronRight,
  Network,
  ReceiptText,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { getCurrentActivity } from "../data/gameState";
import {
  currencyForWorld,
  formatWorldMoney,
} from "../simulation/probabilityModel";

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
}) {
  const currency = currencyForWorld(world);
  const netWorthChange = Number(turn.netWorthChange ?? turn.cashflow) || 0;
  const ChangeIcon = netWorthChange >= 0 ? TrendingUp : TrendingDown;

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
              ? "正在重新评估人生…"
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

          <div className="probability-list">
            <b>下一阶段概率</b>
            {(turn.riskShifts || []).slice(0, 3).map((risk, index) => (
              <div key={`${risk.name}-${index}`}>
                <span>{risk.name}</span>
                <i>
                  <em style={{ width: `${risk.value}%` }} />
                </i>
                <small>{risk.value}%</small>
              </div>
            ))}
          </div>
        </div>
      )}

      {rightTab === "relations" && (
        <div className="right-tab-content">
          <div className="relation-lifecycle-summary">
            <span>
              <b>{relations.length}</b> 活跃关系
            </span>
            <span>
              <b>{historicalContacts.length}</b> 历史联系人
            </span>
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
          <div className="relations">
            {relations.map((relation, index) => (
              <div
                key={`${relation.name}-${index}`}
                className="rel-row"
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
              </div>
            ))}
          </div>
          {historicalContacts.length > 0 && (
            <section className="historical-relations">
              <div className="historical-relations-title">
                <span>自然淡出</span>
                <small>仍保留人物生平与重逢可能</small>
              </div>
              {historicalContacts
                .slice()
                .reverse()
                .map((contact) => (
                  <button
                    key={contact.name}
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
                      <small>
                        {contact.archivedAtAge
                          ? `${contact.archivedAtAge}岁淡出 · `
                          : ""}
                        {contact.archivedReason || "长期没有互动"}
                      </small>
                    </span>
                    <ChevronRight size={13} />
                  </button>
                ))}
            </section>
          )}
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
