import React from "react";
import { Download, X } from "lucide-react";
import { IconButton } from "./Common";
import { calculateFinancialSummary } from "../simulation/financeModel";

const money = (value) =>
  new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 }).format(
    value || 0,
  );

export default function SummaryModal({
  open,
  onClose,
  summary,
  loading,
  error,
  onExport,
  age,
  state,
  settings,
  logs,
}) {
  if (!open) return null;
  const netWorth = calculateFinancialSummary(state).netWorth;
  return (
    <div className="modal-backdrop">
      <div className="modal summary-modal">
        <IconButton onClick={onClose}>
          <X size={18} />
        </IconButton>
        <div className="modal-title">
          <span>人生终章</span>
          <b>
            {loading ? "LLM 正在回望这一生…" : summary?.title || "等待人生总结"}
          </b>
        </div>
        {loading ? (
          <div className="summary-loading">
            <i className="typing" />
            <p>正在整理关键转折、财富轨迹、关系与最终人格。</p>
          </div>
        ) : (
          summary && (
            <>
              <blockquote>{summary.epitaph}</blockquote>
              <p className="summary-overview">{summary.overview}</p>
              <div className="summary-stats">
                <span>
                  <small>结束年龄</small>
                  <b>{age} 岁</b>
                </span>
                <span>
                  <small>净资产</small>
                  <b>¥{money(netWorth)}</b>
                </span>
                <span>
                  <small>推演月数</small>
                  <b>{logs.length - 1}</b>
                </span>
              </div>
              <div className="summary-chapters">
                {(summary.chapters || []).map((c, i) => (
                  <div key={i}>
                    <b>
                      {c.age} · {c.title}
                    </b>
                    <p>{c.text}</p>
                  </div>
                ))}
              </div>
              <div className="summary-verdict">
                <p>
                  <b>最终人格</b>
                  {summary.personality}
                </p>
                <p>
                  <b>财富结论</b>
                  {summary.wealthVerdict}
                </p>
                <p>
                  <b>关系结论</b>
                  {summary.relationshipVerdict}
                </p>
              </div>
            </>
          )
        )}
        {error && <div className="sim-error">{error}</div>}
        <div className="modal-actions">
          <button className="ghost" onClick={onClose}>
            返回人生
          </button>
          <button
            className="primary"
            disabled={!summary || loading}
            onClick={() => onExport(summary, { age, state, settings, logs })}
          >
            <Download size={16} /> 导出人生海报
          </button>
        </div>
      </div>
    </div>
  );
}
