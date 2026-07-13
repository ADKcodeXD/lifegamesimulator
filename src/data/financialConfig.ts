export const ASSET_ACCOUNTS = {
  stocks: { label: "股票 / 基金", shortLabel: "证券", icon: "chart" },
  realEstate: { label: "房产", shortLabel: "房产", icon: "building" },
  vehicles: { label: "车辆", shortLabel: "车辆", icon: "car" },
  receivables: { label: "债权 / 应收款", shortLabel: "债权", icon: "hand" },
  other: { label: "其他资产", shortLabel: "其他", icon: "package" },
} as const;

export const LIABILITY_ACCOUNTS = {
  mortgage: { label: "房贷" },
  loans: { label: "借款" },
  credit: { label: "信用负债" },
  other: { label: "其他负债" },
} as const;

export const TRANSACTION_KIND_LABELS = {
  income: "收入",
  expense: "支出",
  buy_asset: "购入资产",
  sell_asset: "出售资产",
  asset_revaluation: "资产重估",
  borrow: "新增负债",
  repay: "偿还负债",
  receivable_created: "形成债权",
  receivable_collected: "收回债权",
  adjustment: "账务校准",
  opening: "期初余额",
} as const;

export const EMPTY_ASSETS = {
  stocks: 0,
  realEstate: 0,
  vehicles: 0,
  receivables: 0,
  other: 0,
};

export const EMPTY_LIABILITIES = {
  mortgage: 0,
  loans: 0,
  credit: 0,
  other: 0,
};
