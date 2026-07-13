import React, { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Car,
  ChartNoAxesCombined,
  HandCoins,
  Landmark,
  Package,
  ReceiptText,
  WalletCards,
  X,
} from "lucide-react";
import { IconButton } from "./Common";
import {
  ASSET_ACCOUNTS,
  LIABILITY_ACCOUNTS,
  TRANSACTION_KIND_LABELS,
} from "../data/financialConfig.ts";
import { calculateFinancialSummary } from "../simulation/financeModel";
import { formatWorldMoney } from "../simulation/probabilityModel";

const ASSET_ICONS = {
  stocks: ChartNoAxesCombined,
  realEstate: Building2,
  vehicles: Car,
  receivables: HandCoins,
  other: Package,
};

const FILTERS = [
  { id: "all", label: "全部" },
  { id: "cash", label: "收支" },
  { id: "assets", label: "资产" },
  { id: "liabilities", label: "负债" },
];

const signedMoney = (value, world) =>
  `${value > 0 ? "+" : ""}${formatWorldMoney(value, world)}`;

export default function AssetLedgerModal({ open, onClose, state, world }) {
  const [filter, setFilter] = useState("all");
  const summary = calculateFinancialSummary(state);
  const ledger = useMemo(() => {
    const entries = [...(state.ledger || [])].reverse();
    if (filter === "cash") return entries.filter((entry) => entry.cashDelta);
    if (filter === "assets") return entries.filter((entry) => entry.assetDelta);
    if (filter === "liabilities")
      return entries.filter((entry) => entry.liabilityDelta);
    return entries;
  }, [filter, state.ledger]);
  if (!open) return null;

  return (
    <div className="modal-backdrop asset-ledger-backdrop" onClick={onClose}>
      <div
        className="modal asset-ledger-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <IconButton onClick={onClose} className="modal-close-btn">
          <X size={18} />
        </IconButton>
        <header className="asset-ledger-hero">
          <div>
            <small>PERSONAL BALANCE SHEET</small>
            <h2>资产与账本</h2>
            <p>每次收入、支出、资产重估与负债变化都会留下记录。</p>
          </div>
          <div className="asset-ledger-networth">
            <small>当前净资产</small>
            <b>{formatWorldMoney(summary.netWorth, world)}</b>
            <span>总资产 {formatWorldMoney(summary.totalAssets, world)}</span>
          </div>
        </header>

        <div className="asset-ledger-scroll">
          <section className="balance-sheet-section">
            <div className="asset-ledger-section-title">
              <span>
                <WalletCards size={17} /> 资产
              </span>
              <small>按当前可变现价值计算</small>
            </div>
            <div className="asset-balance-grid">
              <article className="asset-balance-item cash-account">
                <i>
                  <WalletCards size={20} />
                </i>
                <span>
                  <small>现金</small>
                  <b>{formatWorldMoney(state.cash, world)}</b>
                </span>
                <em>可直接支配</em>
              </article>
              {Object.entries(ASSET_ACCOUNTS).map(([key, account]) => {
                const AssetIcon = ASSET_ICONS[key];
                return (
                  <article className="asset-balance-item" key={key}>
                    <i>
                      <AssetIcon size={18} />
                    </i>
                    <span>
                      <small>{account.label}</small>
                      <b>{formatWorldMoney(state.assets?.[key] || 0, world)}</b>
                    </span>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="balance-sheet-section liability-section">
            <div className="asset-ledger-section-title">
              <span>
                <Landmark size={17} /> 负债
              </span>
              <strong>{formatWorldMoney(summary.liabilityValue, world)}</strong>
            </div>
            <div className="liability-grid">
              {Object.entries(LIABILITY_ACCOUNTS).map(([key, account]) => (
                <article key={key}>
                  <small>{account.label}</small>
                  <b>
                    {formatWorldMoney(state.liabilities?.[key] || 0, world)}
                  </b>
                </article>
              ))}
            </div>
          </section>

          <section className="ledger-section">
            <div className="asset-ledger-section-title ledger-heading">
              <span>
                <ReceiptText size={17} /> 账本
              </span>
              <small>{state.ledger?.length || 0} 笔记录</small>
            </div>
            <div className="ledger-filters">
              {FILTERS.map((item) => (
                <button
                  type="button"
                  className={filter === item.id ? "active" : ""}
                  onClick={() => setFilter(item.id)}
                  key={item.id}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="ledger-list">
              {ledger.length ? (
                ledger.map((entry) => {
                  const value = Number(entry.netWorthDelta) || 0;
                  const positive = value >= 0;
                  return (
                    <article className="ledger-entry" key={entry.id}>
                      <i className={positive ? "positive" : "negative"}>
                        {positive ? (
                          <ArrowUpRight size={16} />
                        ) : (
                          <ArrowDownRight size={16} />
                        )}
                      </i>
                      <div>
                        <span>
                          <b>{entry.title}</b>
                          <small>
                            {entry.time} ·{" "}
                            {TRANSACTION_KIND_LABELS[entry.kind] || "财务变动"}
                          </small>
                        </span>
                        {entry.note && <p>{entry.note}</p>}
                        <div className="ledger-deltas">
                          {entry.cashDelta !== 0 && (
                            <em>现金 {signedMoney(entry.cashDelta, world)}</em>
                          )}
                          {entry.assetDelta !== 0 && (
                            <em>资产 {signedMoney(entry.assetDelta, world)}</em>
                          )}
                          {entry.liabilityDelta !== 0 && (
                            <em>
                              负债 {signedMoney(entry.liabilityDelta, world)}
                            </em>
                          )}
                        </div>
                      </div>
                      <strong className={positive ? "positive" : "negative"}>
                        {signedMoney(value, world)}
                        <small>净值影响</small>
                      </strong>
                    </article>
                  );
                })
              ) : (
                <p className="ledger-empty">当前筛选下没有账目。</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
