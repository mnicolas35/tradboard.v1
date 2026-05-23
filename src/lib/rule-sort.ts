type SortableRule = {
  accountSize: number;
  accountType?: string;
  evalDrawdownType: string;
  fundedDrawdownType: string;
  isStandard: boolean;
  name: string;
};

type RuleSortMode = "drawdown-then-size" | "size-then-drawdown";

const namedRuleGroups = [
  { key: "intraday", label: "Intraday", rank: 0, patterns: ["intraday", "intra day", "intra-day"] },
  { key: "eod", label: "EOD", rank: 1, patterns: ["eod", "end of day"] },
  { key: "flex", label: "Flex", rank: 2, patterns: ["flex"] },
  { key: "rapid", label: "Rapid", rank: 3, patterns: ["rapid", "rapide"] }
];

function normalizeRuleName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function titleAccountTypeRank(name: string) {
  const normalizedName = normalizeRuleName(name);

  if (/\b(eval|evaluation|challenge)\b/.test(normalizedName)) {
    return 0;
  }

  if (/\b(funded|finance|live)\b/.test(normalizedName)) {
    return 1;
  }

  return 2;
}

function titleFamilyRank(name: string) {
  const normalizedName = normalizeRuleName(name);

  if (/\bfree\b/.test(normalizedName)) {
    return 0;
  }

  if (/\b(trading|trade|combine)\b/.test(normalizedName)) {
    return 1;
  }

  return 2;
}

function titleAccountSize(name: string) {
  const normalizedName = normalizeRuleName(name);
  const compactMatch = normalizedName.match(/\b(\d+(?:[.,]\d+)?)\s?k\b/);

  if (compactMatch) {
    return Number(compactMatch[1].replace(",", ".")) * 1000;
  }

  const fullMatch = normalizedName.match(/\b(\d{4,6})\b/);

  if (fullMatch) {
    return Number(fullMatch[1]);
  }

  return Number.POSITIVE_INFINITY;
}

export function ruleSortGroup(rule: SortableRule, _accountType: string) {
  const normalizedName = normalizeRuleName(rule.name);
  const namedGroup = namedRuleGroups.find((group) => group.patterns.some((pattern) => normalizedName.includes(pattern)));

  return namedGroup ?? { key: "other", label: "Autres", rank: 99 };
}

export function sortPropFirmRules<T extends SortableRule>(rules: T[], accountType: string, mode: RuleSortMode) {
  return [...rules].sort((a, b) => {
    const aGroup = ruleSortGroup(a, accountType);
    const bGroup = ruleSortGroup(b, accountType);
    const groupDiff = aGroup.rank - bGroup.rank;
    const accountTypeDiff = titleAccountTypeRank(a.name) - titleAccountTypeRank(b.name);
    const familyDiff = titleFamilyRank(a.name) - titleFamilyRank(b.name);
    const sizeDiff = titleAccountSize(a.name) - titleAccountSize(b.name);

    if (mode === "drawdown-then-size") {
      return groupDiff || accountTypeDiff || familyDiff || sizeDiff || Number(b.isStandard) - Number(a.isStandard) || a.name.localeCompare(b.name);
    }

    return groupDiff || accountTypeDiff || familyDiff || sizeDiff || Number(b.isStandard) - Number(a.isStandard) || a.name.localeCompare(b.name);
  });
}
