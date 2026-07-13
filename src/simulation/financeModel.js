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

function recurringTransactions(current, result, context) {
  const months = Math.max(1, finite(context.monthsPerTurn, 1));
  const age = finite(context.age, 18);
  const monthlyIncome = Math.max(
    0,
    finite(context.monthlyIncome, result.monthlyIncome ?? current.income),
  );
  const modeled = Array.isArray(result.financialTransactions)
    ? result.financialTransactions.filter(Boolean)
    : [];
  const additions = [];
  const hasRegularIncome = modeled.some(
    (item) =>
      item.kind === "income" &&
      /工资|薪资|薪水|报酬|养老金|固定收入|生活费/.test(
        `${item.label || ""}${item.note || ""}`,
      ),
  );
  if (monthlyIncome > 0 && !hasRegularIncome) {
    additions.push({
      kind: "income",
      account: "cash",
      amount: monthlyIncome * months,
      cashDelta: monthlyIncome * months,
      assetDelta: 0,
      liabilityDelta: 0,
      label: age < 18 ? "家庭生活费" : "阶段固定收入",
      note: `${months}个月的稳定现金收入自动入账`,
    });
  }

  if (age >= 18) {
    const student = /在校|学生|就读/.test(
      `${context.resume?.employmentStatus || ""}${context.resume?.currentRole || ""}`,
    );
    const world = context.settings?.world || "";
    const cityMultiplier = /北京|上海|深圳|纽约|旧金山|东京|新加坡/.test(
      world,
    )
      ? 1.35
      : /小县城|乡镇|农村/.test(world)
        ? 0.72
        : 1;
    const ownsHome = (current.assets?.realEstate || 0) > 0;
    const expenseCategories = [
      {
        key: "housing",
        pattern: /房租|居住|住宿|物业|水电|燃气/,
        label: ownsHome ? "居住维护与水电" : "住房与水电",
        monthly: ownsHome ? 650 : student ? 950 : 1900,
      },
      {
        key: "food",
        pattern: /餐饮|吃饭|伙食|买菜|外卖|日用/,
        label: "餐饮与日用",
        monthly: student ? 1050 : 1450,
      },
      {
        key: "transport",
        pattern: /通勤|交通|公交|地铁|打车|油费/,
        label: "通勤与交通",
        monthly: student ? 260 : 520,
      },
      {
        key: "leisure",
        pattern: /娱乐|社交|聚会|电影|游戏|爱好|酒吧|咖啡/,
        label: "娱乐、社交与爱好",
        monthly: Math.max(
          student ? 320 : 480,
          Math.min(2600, Math.round(monthlyIncome * 0.07)),
        ),
      },
    ];
    for (const category of expenseCategories) {
      const alreadyModeled = modeled.some(
        (item) =>
          item.kind === "expense" &&
          category.pattern.test(`${item.label || ""}${item.note || ""}`),
      );
      if (alreadyModeled) continue;
      const amount = Math.round(category.monthly * cityMultiplier) * months;
      additions.push({
        kind: "expense",
        account: "cash",
        amount,
        cashDelta: -amount,
        assetDelta: 0,
        liabilityDelta: 0,
        label: category.label,
        note: `${months}个月的常规${category.label}自动结算`,
      });
    }

    const focus = result.lifeFocusAudit?.selected?.key;
    const focusExpense = {
      travel: {
        pattern: /旅行|出游|度假|住宿|机票|车票|门票/,
        label: "旅行与出游",
        amount: Math.max(900, Math.min(8000, Math.round(monthlyIncome * 0.45))),
      },
      consumption: {
        pattern: /购物|消费|衣服|数码|家居|装修/,
        label: "个人购物与消费",
        amount: Math.max(500, Math.min(5000, Math.round(monthlyIncome * 0.22))),
      },
      leisure: {
        pattern: /娱乐|聚会|电影|游戏|演出|酒吧|爱好/,
        label: "额外娱乐活动",
        amount: Math.max(300, Math.min(3000, Math.round(monthlyIncome * 0.12))),
      },
    }[focus];
    if (
      focusExpense &&
      !modeled.some(
        (item) =>
          item.kind === "expense" &&
          focusExpense.pattern.test(`${item.label || ""}${item.note || ""}`),
      )
    ) {
      additions.push({
        kind: "expense",
        account: "cash",
        amount: focusExpense.amount,
        cashDelta: -focusExpense.amount,
        assetDelta: 0,
        liabilityDelta: 0,
        label: focusExpense.label,
        note: `本轮${result.lifeFocusAudit.selected.label}主线的实际消费`,
      });
    }
  }
  return additions;
}

export function applyFinancialTurn(state, result, context = {}) {
  const current = normalizeFinancialState(state, state?.cash ?? 0);
  const previousSummary = calculateFinancialSummary(current);
  let cash = current.cash;
  const assets = { ...current.assets };
  const liabilities = { ...current.liabilities };
  const entries = [];
  const modeledTransactions = Array.isArray(result.financialTransactions)
    ? result.financialTransactions.filter(Boolean)
    : [];
  const automaticTransactions = recurringTransactions(current, result, context);
  const transactions = [...modeledTransactions, ...automaticTransactions];

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
  const reportedCashflow = automaticTransactions.length
    ? transactionCashflow
    : Number.isFinite(Number(result.cashflow))
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
