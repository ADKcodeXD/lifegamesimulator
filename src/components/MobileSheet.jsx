import React from "react";
import {
  Activity,
  Brain,
  ChevronRight,
  Heart,
  ReceiptText,
  Target,
  X,
} from "lucide-react";
import { IconButton } from "./Common";
import { formatWorldMoney } from "../simulation/probabilityModel";

export default function MobileSheet({
  mobileSheet,
  setMobileSheet,
  state,
  turn,
  settings,
  netWorth,
  relations,
  historicalContacts = [],
  setSelectedNpcName,
  setRelGraphOpen,
  onOpenLedger,
}) {
  if (!mobileSheet) return null;

  return (
    <div className="mobile-sheet-backdrop" onClick={() => setMobileSheet(null)}>
      <section
        className="mobile-sheet"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mobile-sheet-handle" />
        <header>
          <div>
            <small>实时信息</small>
            <b>
              {mobileSheet === "person"
                ? "人物状态"
                : mobileSheet === "finance"
                  ? "净资产"
                  : "人际关系"}
            </b>
          </div>
          <IconButton onClick={() => setMobileSheet(null)}>
            <X size={18} />
          </IconButton>
        </header>

        {mobileSheet === "person" && (
          <div className="mobile-sheet-content">
            <div className="mobile-status-grid">
              <span>
                <Heart size={16} />
                <small>健康</small>
                <b>{state.health}</b>
              </span>
              <span>
                <Activity size={16} />
                <small>心情</small>
                <b>{state.mood}</b>
              </span>
              <span>
                <Target size={16} />
                <small>事业</small>
                <b>{state.career}</b>
              </span>
            </div>
            <p className="mobile-thought">
              <Brain size={16} />
              {turn.thought || "暂时没有特别的想法。"}
            </p>
            <div className="mobile-bio">
              <b>性格</b>
              <p>
                {settings.personalityProfile?.currentSummary ||
                  settings.bio.personality ||
                  "等待人生塑造"}
              </p>
              <b>爱好</b>
              <p>{settings.bio.hobbies || "未知"}</p>
            </div>
          </div>
        )}

        {mobileSheet === "finance" && (
          <div className="mobile-sheet-content mobile-networth-only">
            <small>当前净资产</small>
            <b>{formatWorldMoney(netWorth, settings.world)}</b>
            <p>现金、资产、负债与每笔收支统一在账本中管理。</p>
            <button onClick={onOpenLedger}>
              <ReceiptText size={17} />
              查看资产与账本
              <ChevronRight size={17} />
            </button>
          </div>
        )}

        {mobileSheet === "relations" && (
          <div className="mobile-sheet-content mobile-relations">
            <div className="mobile-relation-summary">
              <span>{relations.length} 位活跃联系人</span>
              <span>{historicalContacts.length} 位已自然淡出</span>
            </div>
            {relations.map((relation) => (
              <button
                key={relation.name}
                onClick={() => {
                  setSelectedNpcName(relation.name);
                  setMobileSheet(null);
                  setRelGraphOpen(true);
                }}
              >
                <span>{relation.emoji}</span>
                <span>
                  <b>{relation.name}</b>
                  <small>
                    {relation.status}
                    {relation.inactiveYears > 0
                      ? ` · ${relation.inactiveYears}年未互动`
                      : ""}
                  </small>
                </span>
                <em>{relation.value}</em>
                <ChevronRight size={15} />
              </button>
            ))}
            {historicalContacts.length > 0 && (
              <div className="mobile-history-label">历史联系人</div>
            )}
            {historicalContacts
              .slice()
              .reverse()
              .map((contact) => (
                <button
                  className="is-archived"
                  key={contact.name}
                  onClick={() => {
                    setSelectedNpcName(contact.name);
                    setMobileSheet(null);
                    setRelGraphOpen(true);
                  }}
                >
                  <span>{contact.emoji || "○"}</span>
                  <span>
                    <b>{contact.name}</b>
                    <small>{contact.archivedReason || "长期没有互动"}</small>
                  </span>
                  <em>历史</em>
                  <ChevronRight size={15} />
                </button>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
