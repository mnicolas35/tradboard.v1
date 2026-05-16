type SortableRule = {
  accountSize: number;
  evalDrawdownType: string;
  fundedDrawdownType: string;
  isStandard: boolean;
  name: string;
};

type RuleSortMode = "drawdown-then-size" | "size-then-drawdown";

function drawdownRank(value: string) {
  return value === "INTRADAY" ? 0 : value === "EOD" ? 1 : 2;
}

function drawdownTypeForAccount(rule: SortableRule, accountType: string) {
  return accountType === "FUNDED" ? rule.fundedDrawdownType : rule.evalDrawdownType;
}

export function sortPropFirmRules<T extends SortableRule>(rules: T[], accountType: string, mode: RuleSortMode) {
  return [...rules].sort((a, b) => {
    const aDrawdownRank = drawdownRank(drawdownTypeForAccount(a, accountType));
    const bDrawdownRank = drawdownRank(drawdownTypeForAccount(b, accountType));
    const sizeDiff = a.accountSize - b.accountSize;
    const drawdownDiff = aDrawdownRank - bDrawdownRank;

    if (mode === "drawdown-then-size") {
      return drawdownDiff || sizeDiff || Number(b.isStandard) - Number(a.isStandard) || a.name.localeCompare(b.name);
    }

    return sizeDiff || drawdownDiff || Number(b.isStandard) - Number(a.isStandard) || a.name.localeCompare(b.name);
  });
}
