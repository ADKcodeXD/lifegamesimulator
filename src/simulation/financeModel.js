import {
  ASSET_ACCOUNTS,
  EMPTY_ASSETS,
  EMPTY_LIABILITIES,
  LIABILITY_ACCOUNTS,
  TRANSACTION_KIND_LABELS,
} from "../data/financialConfig.ts";

const finite = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : fallback;
};

const sumValues = (record) =>
  Object.values(record || {}).reduce((sum, value) => sum + finite(value), 0);

const normalizeRecord = (source, template) =>
  Object.fromEntries(
    Object.keys(template).map((key) => [
      key,
      Math.max(0, finite(source?.[key])),
    ]),
  );

export const createInitialState = (initialCash = 1000) => {
  const cash = finite(initialCash, 1000);
  return {
    cash,
    debt: 0,
    income: 0,
    health: 86,
    mood: 72,
    career: 12,
    assets: { ...EMPTY_ASSETS },
    liabilities: { ...EMPTY_LIABILITIES },
    ledger: [
      {
        id: "opening-0",
        time: "序章",
        title: "期初资金",
        kind: "opening",
        account: "cash",
        cashDelta: cash,
        assetDelta: 0,
        liabilityDelta: 0,
        netWorthDelta: cash,
        note: "人生模拟开始时可自由支配的现金",
        balanceAfter: cash,
      },
    ],
  };
};

export function normalizeFinancialState(rawState = {}, fallbackCash = 1000) {
  const cash = finite(rawState.cash, fallbackCash);
  const assets = normalizeRecord(rawState.assets, EMPTY_ASSETS);
  const liabilities = normalizeRecord(rawState.liabilities, EMPTY_LIABILITIES);
  const legacyDebt = Math.max(0, finite(rawState.debt));
  const categorizedDebt = sumValues(liabilities);
  if (legacyDebt > categorizedDebt)
    liabilities.other += legacyDebt - categorizedDebt;
  const debt = sumValues(liabilities);
  const ledger = Array.isArray(rawState.ledger)
    ? rawState.ledger.filter(Boolean).slice(-1000)
    : [
        {
          id: "migration-opening",
          time: "旧存档",
          title: "存档余额迁移",
          kind: "opening",
          account: "cash",
          cashDelta: cash,
          assetDelta: sumValues(assets),
          liabilityDelta: debt,
          netWorthDelta: cash + sumValues(assets) - debt,
          note: "旧版本未保存逐笔流水，从当前余额开始记账",
          balanceAfter: cash,
        },
      ];

  return {
    ...rawState,
    cash,
    debt,
    income: Math.max(0, finite(rawState.income)),
    health: finite(rawState.health, 86),
    mood: finite(rawState.mood, 72),
    career: finite(rawState.career, 12),
    assets,
    liabilities,
    ledger,
  };
}

export const calculateFinancialSummary = (state) => {
  const normalized = normalizeFinancialState(state, state?.cash ?? 0);
  const assetValue = sumValues(normalized.assets);
  const liabilityValue = sumValues(normalized.liabilities);
  return {
    cash: normalized.cash,
    assetValue,
    liabilityValue,
    totalAssets: normalized.cash + assetValue,
    netWorth: normalized.cash + assetValue - liabilityValue,
  };
};

const assetAccount = (account) =>
  Object.hasOwn(ASSET_ACCOUNTS, account) ? account : "other";
const liabilityAccount = (account) =>
  Object.hasOwn(LIABILITY_ACCOUNTS, account) ? account : "other";

function transactionDeltas(transaction) {
  const kind = transaction.kind || "adjustment";
  const amount = Math.abs(finite(transaction.amount));
  const hasExplicitCash = Number.isFinite(Number(transaction.cashDelta));
  const hasExplicitAsset = Number.isFinite(Number(transaction.assetDelta));
  const hasExplicitLiability = Number.isFinite(
    Number(transaction.liabilityDelta),
  );
  let cashDelta = hasExplicitCash ? finite(transaction.cashDelta) : 0;
  let assetDelta = hasExplicitAsset ? finite(transaction.assetDelta) : 0;
  let liabilityDelta = hasExplicitLiability
    ? finite(transaction.liabilityDelta)
    : 0;

  if (!hasExplicitCash) {
    if (
      ["income", "sell_asset", "borrow", "receivable_collected"].includes(kind)
    )
      cashDelta = amount;
    if (["expense", "buy_asset", "repay"].includes(kind)) cashDelta = -amount;
  }
  if (!hasExplicitAsset) {
    if (["buy_asset", "receivable_created"].includes(kind)) assetDelta = amount;
    if (["sell_asset", "receivable_collected"].includes(kind))
      assetDelta = -amount;
    if (kind === "asset_revaluation") assetDelta = finite(transaction.amount);
  }
  if (!hasExplicitLiability) {
    if (kind === "borrow") liabilityDelta = amount;
    if (kind === "repay") liabilityDelta = -amount;
  }
  return { kind, cashDelta, assetDelta, liabilityDelta };
}

export function applyFinancialTurn(state, result, context = {}) {
  const current = normalizeFinancialState(state, state?.cash ?? 0);
  const previousSummary = calculateFinancialSummary(current);
  let cash = current.cash;
  const assets = { ...current.assets };
  const liabilities = { ...current.liabilities };
  const entries = [];
  const transactions = Array.isArray(result.financialTransactions)
    ? result.financialTransactions.filter(Boolean)
    : [];

  const appendEntry = (transaction, index, deltas) => {
    const isLiability = deltas.liabilityDelta !== 0;
    const account = isLiability
      ? liabilityAccount(transaction.account)
      : deltas.assetDelta !== 0
        ? assetAccount(transaction.account)
        : "cash";
    const beforeAsset = account === "cash" ? 0 : assets[account] || 0;
    const beforeLiability = isLiability ? liabilities[account] || 0 : 0;
    cash += deltas.cashDelta;
    let actualAssetDelta = 0;
    let actualLiabilityDelta = 0;
    if (deltas.assetDelta !== 0) {
      assets[account] = Math.max(0, beforeAsset + deltas.assetDelta);
      actualAssetDelta = assets[account] - beforeAsset;
    }
    if (deltas.liabilityDelta !== 0) {
      liabilities[account] = Math.max(
        0,
        beforeLiability + deltas.liabilityDelta,
      );
      actualLiabilityDelta = liabilities[account] - beforeLiability;
    }
    entries.push({
      id: `${context.month ?? "turn"}-${current.ledger.length + index + 1}`,
      time: context.time || "本轮",
      title:
        transaction.label || TRANSACTION_KIND_LABELS[deltas.kind] || "财务变动",
      kind: deltas.kind,
      account,
      cashDelta: deltas.cashDelta,
      assetDelta: actualAssetDelta,
      liabilityDelta: actualLiabilityDelta,
      netWorthDelta: deltas.cashDelta + actualAssetDelta - actualLiabilityDelta,
      note: transaction.note || context.title || "",
      balanceAfter: cash,
    });
  };

  transactions.forEach((transaction, index) =>
    appendEntry(transaction, index, transactionDeltas(transaction)),
  );

  const transactionCashflow = entries.reduce(
    (sum, entry) => sum + entry.cashDelta,
    0,
  );
  const reportedCashflow = Number.isFinite(Number(result.cashflow))
    ? finite(result.cashflow)
    : transactions.length
      ? transactionCashflow
      : Number.isFinite(Number(result.stateDelta?.cash))
        ? finite(result.stateDelta.cash)
        : transactionCashflow;
  const cashReconciliation = reportedCashflow - transactionCashflow;
  if (
    cashReconciliation !== 0 ||
    (!transactions.length && reportedCashflow !== 0)
  ) {
    appendEntry(
      {
        kind: cashReconciliation >= 0 ? "income" : "expense",
        label: transactions.length
          ? "现金流校准"
          : result.title || "本轮现金流",
        note: transactions.length
          ? "模型汇总现金流与明细差额，已自动补记"
          : result.log || result.summary || "本轮现金变化",
      },
      entries.length,
      {
        kind: cashReconciliation >= 0 ? "income" : "expense",
        cashDelta: transactions.length ? cashReconciliation : reportedCashflow,
        assetDelta: 0,
        liabilityDelta: 0,
      },
    );
  }

  const transactionDebtDelta = entries.reduce(
    (sum, entry) => sum + entry.liabilityDelta,
    0,
  );
  const hasReportedDebtDelta =
    !transactions.length && Number.isFinite(Number(result.stateDelta?.debt));
  const reportedDebtDelta = hasReportedDebtDelta
    ? finite(result.stateDelta.debt)
    : transactionDebtDelta;
  const debtReconciliation = reportedDebtDelta - transactionDebtDelta;
  if (hasReportedDebtDelta && debtReconciliation !== 0) {
    appendEntry(
      {
        kind: debtReconciliation > 0 ? "borrow" : "repay",
        account: "other",
        label: debtReconciliation > 0 ? "新增未分类负债" : "偿还未分类负债",
        note: "由状态变化自动补记",
      },
      entries.length,
      {
        kind: debtReconciliation > 0 ? "borrow" : "repay",
        cashDelta: 0,
        assetDelta: 0,
        liabilityDelta: debtReconciliation,
      },
    );
  }

  const nextState = {
    ...current,
    cash,
    debt: sumValues(liabilities),
    assets,
    liabilities,
    ledger: [...current.ledger, ...entries].slice(-1000),
  };
  const nextSummary = calculateFinancialSummary(nextState);
  return {
    state: nextState,
    entries,
    cashflow: nextState.cash - current.cash,
    netWorthChange: nextSummary.netWorth - previousSummary.netWorth,
    summary: nextSummary,
  };
}
