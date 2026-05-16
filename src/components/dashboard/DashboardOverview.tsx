"use client";

import { useEffect, useMemo, useState, type DragEvent, type FormEvent } from "react";
import { formatCurrency } from "@/lib/format";
import type { AppData, MarketWatchItemSummary } from "@/types";

type DashboardOverviewProps = {
  data: AppData;
};

function currentPeriod() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth(),
    date: now
  };
}

function isInYear(date: string, year: number) {
  return new Date(`${date}T00:00:00`).getFullYear() === year;
}

function isInMonth(date: string, year: number, month: number) {
  const value = new Date(`${date}T00:00:00`);
  return value.getFullYear() === year && value.getMonth() === month;
}

function monthPeriod(date: Date, offset = 0) {
  const period = new Date(date.getFullYear(), date.getMonth() + offset, 1);

  return {
    year: period.getFullYear(),
    month: period.getMonth(),
    label: new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(period)
  };
}

function accountLabel(account: AppData["accounts"][number]) {
  return account.accountNumber ? `#${account.accountNumber}` : "Sans numero";
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function chartStep(maxValue: number) {
  if (maxValue <= 10000) return 1000;
  if (maxValue <= 20000) return 2000;
  if (maxValue <= 50000) return 5000;
  return 10000;
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  };
}

function describePieSlice(centerX: number, centerY: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(centerX, centerY, radius, endAngle);
  const end = polarToCartesian(centerX, centerY, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    `M ${centerX} ${centerY}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    "Z"
  ].join(" ");
}

function darkenHexColor(hex: string, amount = 0.2) {
  const normalized = hex.replace("#", "");
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);

  const scale = 1 - amount;
  const toHex = (value: number) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");

  return `#${toHex(r * scale)}${toHex(g * scale)}${toHex(b * scale)}`;
}

function compactAmount(value: number) {
  if (value >= 1000) {
    return `${Math.round(value / 1000)}k`;
  }

  return String(value);
}

const marketInstruments = [
  {
    id: "nasdaq",
    label: "Nasdaq futures",
    ticker: "MNQM2026",
    feedSymbol: "CME_MINI:MNQM2026",
    category: "US Futures",
    price: "29 172",
    change: 0.74,
    color: "#3b82f6",
    points: [28640, 28780, 28692, 28880, 28990, 28942, 29080, 29036, 29220, 29172]
  },
  {
    id: "sp500",
    label: "S&P 500 futures",
    ticker: "MES",
    feedSymbol: "CME_MINI:MES1!",
    category: "US Futures",
    price: "7 417.75",
    change: 0.36,
    color: "#10b981",
    points: [7358, 7374, 7362, 7388, 7396, 7384, 7404, 7398, 7426, 7417.75]
  },
  {
    id: "oil",
    label: "WTI Micro",
    ticker: "MCL1!",
    feedSymbol: "NYMEX:MCL1!",
    category: "US Futures",
    price: "101.24",
    change: -0.36,
    color: "#ef4444",
    points: [102.1, 101.8, 101.5, 101.7, 101.3, 100.9, 101.2, 100.8, 101.5, 101.24]
  },
  {
    id: "dowjones",
    label: "Dow Jones",
    ticker: "YM1!",
    feedSymbol: "CBOT_MINI:YM1!",
    category: "Indices",
    price: "39 872",
    change: 0.19,
    color: "#6366f1",
    points: [39620, 39780, 39690, 39820, 39910, 39790, 39860, 39940, 39810, 39872]
  },
  {
    id: "russell",
    label: "Russell 2000",
    ticker: "M2K1!",
    feedSymbol: "CME_MINI:M2K1!",
    category: "Indices",
    price: "2 146.8",
    change: -0.08,
    color: "#14b8a6",
    points: [2164, 2158, 2149, 2161, 2152, 2144, 2150, 2142, 2151, 2146.8]
  },
  {
    id: "dax",
    label: "DAX",
    ticker: "DAX",
    feedSymbol: "XETR:DAX",
    category: "Indices",
    price: "18 692",
    change: -0.22,
    color: "#f97316",
    points: [18780, 18730, 18690, 18740, 18620, 18590, 18660, 18710, 18635, 18692]
  },
  {
    id: "gold",
    label: "Gold",
    ticker: "XAU/USD",
    feedSymbol: "TVC:GOLD",
    category: "Commodities",
    price: "2 364",
    change: -0.18,
    color: "#f59e0b",
    points: [2378, 2372, 2368, 2374, 2361, 2358, 2366, 2363, 2360, 2364]
  },
  {
    id: "silver",
    label: "Silver",
    ticker: "XAG/USD",
    feedSymbol: "TVC:SILVER",
    category: "Commodities",
    price: "30.42",
    change: 0.41,
    color: "#94a3b8",
    points: [29.8, 30.0, 29.9, 30.2, 30.1, 30.4, 30.6, 30.3, 30.5, 30.42]
  },
  {
    id: "btc",
    label: "Bitcoin",
    ticker: "BTC/USD",
    feedSymbol: "CRYPTO:BTCUSD",
    category: "Crypto",
    price: "67 420",
    change: 1.12,
    color: "#f97316",
    points: [64200, 64840, 65120, 64680, 65820, 66400, 66150, 67040, 67620, 67420]
  },
  {
    id: "eth",
    label: "Ethereum",
    ticker: "ETH/USD",
    feedSymbol: "CRYPTO:ETHUSD",
    category: "Crypto",
    price: "3 118",
    change: 0.66,
    color: "#8b5cf6",
    points: [3020, 3054, 3048, 3092, 3078, 3120, 3108, 3142, 3130, 3118]
  }
] as const;

type MarketRange = "1d" | "7d" | "1m" | "3m" | "6m";

type MarketSearchResult = {
  query: string;
  symbol: string;
  displaySymbol: string;
  name: string;
  exchange: string | null;
  quoteType: string | null;
  instrumentType: string;
  contractRoot: string | null;
  activeContractCode: string | null;
  activeContractMonth: number | null;
  activeContractYear: number | null;
  feedSymbol: string;
  source: "YAHOO";
};

type MarketSeries = {
  symbol: string;
  price: number | null;
  changePercent: number | null;
  points: number[];
  updatedAt: string;
};

const marketRanges: Array<{ id: MarketRange; label: string }> = [
  { id: "1d", label: "1J" },
  { id: "7d", label: "7J" },
  { id: "1m", label: "1M" },
  { id: "3m", label: "3M" },
  { id: "6m", label: "6M" }
];

function marketRangePoints(points: readonly number[], range: MarketRange) {
  if (points.length === 0) {
    return [];
  }

  if (points.length > 14) {
    return [...points];
  }

  const last = points[points.length - 1] ?? 0;

  if (range === "1d") {
    const recent = points.slice(-4);

    return recent.flatMap((point, index) => {
      const nextPoint = recent[index + 1];

      return nextPoint === undefined
        ? [point]
        : [point, point + (nextPoint - point) * 0.45];
    });
  }

  if (range === "7d") {
    return [...points];
  }

  const configs: Record<Exclude<MarketRange, "1d" | "7d">, { amplitude: number; trend: number }> = {
    "1m": { amplitude: 0.014, trend: -0.018 },
    "3m": { amplitude: 0.026, trend: 0.034 },
    "6m": { amplitude: 0.042, trend: -0.052 }
  };
  const config = configs[range];
  const history = Array.from({ length: 8 }, (_, index) => {
    const progress = index / 7;
    const wave = Math.sin((progress * Math.PI * 2) + (range === "6m" ? 0.8 : 0));
    const base = last * (1 + config.trend * (1 - progress));

    return base + last * config.amplitude * wave;
  });

  return [...history, ...points.slice(-6)];
}

function marketPath(points: readonly number[], width = 320, height = 130) {
  if (points.length === 0) {
    return "";
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(max - min, 1);
  const step = width / Math.max(points.length - 1, 1);

  return points
    .map((point, index) => {
      const x = index * step;
      const y = height - ((point - min) / range) * (height - 18) - 9;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function marketAreaPath(points: readonly number[], width = 320, height = 130) {
  if (points.length === 0) {
    return "";
  }

  return `${marketPath(points, width, height)} L ${width} ${height} L 0 ${height} Z`;
}

function marketLastY(points: readonly number[], height = 130) {
  if (points.length === 0) {
    return height / 2;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(max - min, 1);
  const last = points[points.length - 1] ?? min;

  return height - ((last - min) / range) * (height - 18) - 9;
}

function formatMarketPrice(value: number | null) {
  if (value === null) {
    return "--";
  }

  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: value >= 1000 ? 2 : 4
  }).format(value);
}

export function DashboardOverview({ data }: DashboardOverviewProps) {
  const [watchedMarkets, setWatchedMarkets] = useState<MarketWatchItemSummary[]>(data.marketWatchlist);
  const [selectedMarketSymbols, setSelectedMarketSymbols] = useState<string[]>(data.marketWatchlist.map((item) => item.symbol));
  const [marketRange, setMarketRange] = useState<MarketRange>("7d");
  const [marketSeriesBySymbol, setMarketSeriesBySymbol] = useState<Record<string, MarketSeries>>({});
  const [marketSearchQuery, setMarketSearchQuery] = useState("");
  const [marketSearchResults, setMarketSearchResults] = useState<MarketSearchResult[]>([]);
  const [marketStatus, setMarketStatus] = useState<string | null>(null);
  const [draggedMarketId, setDraggedMarketId] = useState<string | null>(null);
  const { year, month, date } = currentPeriod();
  const currentMonth = monthPeriod(date);
  const previousMonths = [-1, -2, -3].map((offset) => monthPeriod(date, offset));
  const activeAccounts = data.accounts.filter((account) => account.status === "ACTIVE");
  const propFirmCounts = activeAccounts
    .reduce<Map<string, { name: string; count: number }>>((counts, account) => {
      const current = counts.get(account.propFirmId) ?? { name: account.propFirmName, count: 0 };
      counts.set(account.propFirmId, { ...current, count: current.count + 1 });
      return counts;
    }, new Map());

  const propFirmRows = [...propFirmCounts.values()].sort((a, b) => a.name.localeCompare(b.name));
  const propFirmAcronyms = new Map(data.accounts.map((account) => [account.propFirmName, account.propFirmAcronym]));
  const payoutPossibleAccounts = data.activeAccounts
    .filter((account) => (
      account.accountType === "FUNDED" &&
      account.status === "ACTIVE" &&
      account.payoutEligibility.isEligible &&
      account.payoutEligibility.availableAmount > 0
    ))
    .sort((a, b) => a.propFirmName.localeCompare(b.propFirmName) || accountLabel(a).localeCompare(accountLabel(b)));
  const payoutPossibleTotal = sum(payoutPossibleAccounts.map((account) => account.payoutEligibility.availableAmount));
  const payoutHistoryAccounts = data.accounts.filter((account) => (
    account.accountType === "FUNDED" &&
    (account.status === "ACTIVE" || account.status === "FAILED") &&
    account.payouts.some((payout) => payout.status === "PAID")
  ));
  const paidPayouts = payoutHistoryAccounts.flatMap((account) => (
    account.payouts
      .filter((payout) => payout.status === "PAID")
      .map((payout) => ({ ...payout, propFirmId: account.propFirmId, propFirmName: account.propFirmName }))
  ));
  const annualPayouts = sum(paidPayouts.filter((payout) => isInYear(payout.date, year)).map((payout) => payout.amount));
  const monthlyPayouts = sum(paidPayouts.filter((payout) => isInMonth(payout.date, year, month)).map((payout) => payout.amount));
  const parentAccountIds = new Set(data.accounts.map((account) => account.parentAccountId).filter(Boolean));
  const costCarrierAccounts = data.accounts.filter((account) => !parentAccountIds.has(account.id));
  const costLines = costCarrierAccounts.flatMap((account) => (
    account.costHistory.map((cost) => ({ ...cost, propFirmId: account.propFirmId, propFirmName: account.propFirmName }))
  ));
  const annualCosts = sum(costLines.filter((cost) => isInYear(cost.date, year)).map((cost) => cost.amount));
  const monthlyCosts = sum(costLines.filter((cost) => isInMonth(cost.date, year, month)).map((cost) => cost.amount));
  const annualCostsByPropFirm = [...costLines
    .filter((cost) => isInYear(cost.date, year))
    .reduce<Map<string, { name: string; amount: number }>>((rows, cost) => {
      const current = rows.get(cost.propFirmId) ?? { name: cost.propFirmName, amount: 0 };
      rows.set(cost.propFirmId, { ...current, amount: current.amount + cost.amount });
      return rows;
    }, new Map())
    .values()]
    .sort((a, b) => a.name.localeCompare(b.name));
  const monthlyCostsByPropFirm = [...costLines
    .filter((cost) => isInMonth(cost.date, year, month))
    .reduce<Map<string, { name: string; amount: number }>>((rows, cost) => {
      const current = rows.get(cost.propFirmId) ?? { name: cost.propFirmName, amount: 0 };
      rows.set(cost.propFirmId, { ...current, amount: current.amount + cost.amount });
      return rows;
    }, new Map())
    .values()]
    .sort((a, b) => a.name.localeCompare(b.name));
  const annualBalance = annualPayouts - annualCosts;
  const monthlyBalance = monthlyPayouts - monthlyCosts;
  const previousMonthlyBalances = previousMonths.map((period) => {
    const periodPayouts = sum(paidPayouts.filter((payout) => isInMonth(payout.date, period.year, period.month)).map((payout) => payout.amount));
    const periodCosts = sum(costLines.filter((cost) => isInMonth(cost.date, period.year, period.month)).map((cost) => cost.amount));

    return {
      ...period,
      balance: periodPayouts - periodCosts
    };
  });
  const monthlyChartRows = [-3, -2, -1, 0].map((offset) => {
    const period = monthPeriod(date, offset);

    return {
      ...period,
      costs: sum(costLines.filter((cost) => isInMonth(cost.date, period.year, period.month)).map((cost) => cost.amount)),
      payouts: sum(paidPayouts.filter((payout) => isInMonth(payout.date, period.year, period.month)).map((payout) => payout.amount))
    };
  });
  const monthlyChartMax = Math.max(1, ...monthlyChartRows.flatMap((row) => [row.costs, row.payouts]));
  const monthlyChartStep = chartStep(monthlyChartMax);
  const monthlyChartScaleMax = Math.max(monthlyChartStep, Math.ceil(monthlyChartMax / monthlyChartStep) * monthlyChartStep);
  const chartScaleRows = Array.from(
    { length: monthlyChartScaleMax / monthlyChartStep },
    (_, index) => monthlyChartScaleMax - index * monthlyChartStep
  );
  const barHeight = (value: number) => `${Math.max(value > 0 ? 6 : 0, (value / monthlyChartScaleMax) * 100)}%`;
  const annualPropFirmMap = new Map<string, { acronym: string; name: string; costs: number; payouts: number }>();
  annualCostsByPropFirm.forEach((row) => {
    annualPropFirmMap.set(row.name, {
      acronym: propFirmAcronyms.get(row.name) ?? row.name,
      name: row.name,
      costs: row.amount,
      payouts: 0
    });
  });
  paidPayouts
    .filter((payout) => isInYear(payout.date, year))
    .forEach((payout) => {
      const current = annualPropFirmMap.get(payout.propFirmName) ?? {
        acronym: propFirmAcronyms.get(payout.propFirmName) ?? payout.propFirmName,
        name: payout.propFirmName,
        costs: 0,
        payouts: 0
      };
      annualPropFirmMap.set(payout.propFirmName, { ...current, payouts: current.payouts + payout.amount });
    });
  const propFirmAnnualRows = [...annualPropFirmMap.values()]
    .filter((row) => row.costs > 0 || row.payouts > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
  const annualPieTotal = sum(propFirmAnnualRows.flatMap((row) => [row.costs, row.payouts]));
  const piePalette = [
    ["#f59e0b", "#22c55e"],
    ["#fb923c", "#16a34a"],
    ["#f97316", "#15803d"],
    ["#d97706", "#65a30d"],
    ["#fbbf24", "#4ade80"],
    ["#ea580c", "#059669"]
  ];
  const pieSegments = annualPieTotal > 0
    ? propFirmAnnualRows.flatMap((row, index) => {
        const [costColor, payoutColor] = piePalette[index % piePalette.length];

        return [
          { label: `${row.name} cout`, value: row.costs, color: costColor },
          { label: `${row.name} payouts`, value: row.payouts, color: payoutColor }
        ];
      }).filter((segment) => segment.value > 0)
    : [];
  const pieTotal = sum(pieSegments.map((segment) => segment.value));
  let pieAngle = 0;
  const pieSlices = pieSegments.map((segment) => {
    const angle = (segment.value / pieTotal) * 360;
    const startAngle = pieAngle;
    const endAngle = pieAngle + angle;
    const midAngle = (startAngle + endAngle) / 2;
    const explodeDistance = 14;
    const offset = polarToCartesian(0, 0, explodeDistance, midAngle);
    pieAngle = endAngle;

    return {
      ...segment,
      startAngle,
      endAngle,
      offsetX: offset.x,
      offsetY: offset.y
    };
  });
  const watchedSymbols = useMemo(() => watchedMarkets.map((instrument) => instrument.symbol), [watchedMarkets]);
  const selectedMarkets = watchedMarkets
    .filter((instrument) => selectedMarketSymbols.includes(instrument.symbol))
    .map((instrument) => {
      const series = marketSeriesBySymbol[instrument.symbol];
      return {
        ...instrument,
        price: series?.price ?? null,
        change: series?.changePercent ?? 0,
        points: series?.points ?? [],
        updatedAt: series?.updatedAt ?? null
      };
    });

  useEffect(() => {
    setWatchedMarkets(data.marketWatchlist);
    setSelectedMarketSymbols(data.marketWatchlist.map((item) => item.symbol));
  }, [data.marketWatchlist]);

  useEffect(() => {
    if (watchedSymbols.length === 0) {
      setMarketSeriesBySymbol({});
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      symbols: watchedSymbols.join(","),
      range: marketRange
    });

    fetch(`/api/market/series?${params.toString()}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("series")))
      .then((payload: { series?: MarketSeries[] }) => {
        setMarketSeriesBySymbol(Object.fromEntries((payload.series ?? []).map((series) => [series.symbol, series])));
        setMarketStatus(null);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setMarketStatus("Données marché indisponibles pour le moment.");
      });

    return () => controller.abort();
  }, [marketRange, watchedSymbols]);

  async function searchMarket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = marketSearchQuery.trim();
    if (query.length < 2) {
      setMarketSearchResults([]);
      return;
    }

    setMarketStatus("Recherche en cours...");
    const response = await fetch(`/api/market/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      setMarketStatus("Recherche marché indisponible.");
      return;
    }
    const payload = await response.json() as { results?: MarketSearchResult[] };
    setMarketSearchResults(payload.results ?? []);
    setMarketStatus((payload.results ?? []).length === 0 ? "Aucun symbole trouvé." : null);
  }

  async function addMarketInstrument(instrument: MarketSearchResult) {
    setMarketStatus("Ajout en cours...");
    const response = await fetch("/api/market/watchlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ instrument })
    });

    if (!response.ok) {
      setMarketStatus("Impossible d'ajouter cette valeur.");
      return;
    }

    const payload = await response.json() as { item: MarketWatchItemSummary };
    setWatchedMarkets((current) => {
      const withoutDuplicate = current.filter((item) => item.symbol !== payload.item.symbol);
      return [...withoutDuplicate, payload.item].sort((a, b) => a.sortOrder - b.sortOrder);
    });
    setSelectedMarketSymbols((current) => current.includes(payload.item.symbol) ? current : [...current, payload.item.symbol]);
    setMarketSearchQuery("");
    setMarketSearchResults([]);
    setMarketStatus(null);
  }

  async function removeMarketInstrument(instrument: MarketWatchItemSummary) {
    setWatchedMarkets((current) => current.filter((item) => item.id !== instrument.id));
    setSelectedMarketSymbols((current) => current.filter((symbol) => symbol !== instrument.symbol));
    await fetch(`/api/market/watchlist/${instrument.id}`, { method: "DELETE" });
  }

  async function persistMarketOrder(markets: MarketWatchItemSummary[]) {
    await fetch("/api/market/watchlist", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderedIds: markets.map((instrument) => instrument.id) })
    });
  }

  function reorderMarketInstrument(targetId: string) {
    if (!draggedMarketId || draggedMarketId === targetId) {
      return;
    }

    setWatchedMarkets((current) => {
      const fromIndex = current.findIndex((instrument) => instrument.id === draggedMarketId);
      const toIndex = current.findIndex((instrument) => instrument.id === targetId);

      if (fromIndex === -1 || toIndex === -1) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      const ordered = next.map((instrument, sortOrder) => ({ ...instrument, sortOrder }));
      persistMarketOrder(ordered).catch(() => setMarketStatus("Ordre non sauvegardé."));

      return ordered;
    });
  }

  function allowMarketDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  return (
    <div className="global-dashboard-stack" aria-label="Dashboard global">
      <div className="global-dashboard-grid">
        <section className="panel global-kpi-card">
          <div className="global-kpi-top">
            <div className="global-kpi-header">
              <h2>Compte totaux</h2>
            </div>
            <strong className="global-kpi-value">{activeAccounts.length}</strong>
          </div>
          <div className="global-kpi-list global-kpi-bottom">
            {propFirmRows.length === 0 ? (
              <p className="global-kpi-empty">Aucune propfirm utilisée.</p>
            ) : (
              propFirmRows.map((row) => (
                <div className="global-kpi-row" key={row.name}>
                  <span>{row.name}</span>
                  <strong>{row.count}</strong>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="panel global-kpi-card">
          <div className="global-kpi-top">
            <div className="global-kpi-header">
              <h2>Payout possible</h2>
            </div>
            <strong className="global-kpi-value tone-positive">{formatCurrency(payoutPossibleTotal)}</strong>
            <div className="global-kpi-list">
              <div className="global-kpi-row">
                <span>Payout pris annuel</span>
                <strong>{formatCurrency(annualPayouts)}</strong>
              </div>
              <div className="global-kpi-row">
                <span>Payout pris {currentMonth.label}</span>
                <strong>{formatCurrency(monthlyPayouts)}</strong>
              </div>
            </div>
          </div>
          <div className="global-kpi-list global-kpi-bottom">
            {payoutPossibleAccounts.length === 0 ? (
              <p className="global-kpi-empty">Aucun compte en payout possible.</p>
            ) : (
              payoutPossibleAccounts.map((account) => (
                <div className="global-kpi-row" key={account.id}>
                  <span>
                    {account.propFirmAcronym} {accountLabel(account)}
                  </span>
                  <strong>{formatCurrency(account.payoutEligibility.availableAmount)}</strong>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="panel global-kpi-card">
          <div className="global-kpi-top">
            <div className="global-kpi-header">
              <h2>Bilan</h2>
            </div>
            <div className="global-kpi-list">
              <div className="global-kpi-row emphasis">
                <span>Bilan annuel</span>
                <strong className={annualBalance >= 0 ? "tone-positive" : "tone-negative"}>{formatCurrency(annualBalance)}</strong>
              </div>
              <div className="global-kpi-row emphasis">
                <span>Bilan {currentMonth.label}</span>
                <strong className={monthlyBalance >= 0 ? "tone-positive" : "tone-negative"}>{formatCurrency(monthlyBalance)}</strong>
              </div>
            </div>
          </div>
          <div className="global-kpi-list global-kpi-bottom">
            {previousMonthlyBalances.map((row) => (
              <div className="global-kpi-row" key={`${row.year}-${row.month}`}>
                <span>Bilan {row.label}</span>
                <strong className={row.balance >= 0 ? "tone-positive" : "tone-negative"}>{formatCurrency(row.balance)}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="panel global-kpi-card">
          <div className="global-kpi-top">
            <div className="global-kpi-header">
              <h2>Cout investi</h2>
            </div>
            <div className="global-kpi-list">
              <div className="global-kpi-row emphasis">
                <span>Annuel</span>
                <strong>{formatCurrency(annualCosts)}</strong>
              </div>
              {annualCostsByPropFirm.length === 0 ? (
                <p className="global-kpi-empty">Aucun investissement annuel.</p>
              ) : (
                annualCostsByPropFirm.map((row) => (
                  <div className="global-kpi-row" key={`annual-${row.name}`}>
                    <span>{row.name}</span>
                    <strong>{formatCurrency(row.amount)}</strong>
                  </div>
                ))
              )}
            </div>
            <div className="global-kpi-list">
              <div className="global-kpi-row emphasis">
                <span>{currentMonth.label}</span>
                <strong>{formatCurrency(monthlyCosts)}</strong>
              </div>
              {monthlyCostsByPropFirm.length === 0 ? (
                <p className="global-kpi-empty">Aucun investissement mensuel.</p>
              ) : (
                monthlyCostsByPropFirm.map((row) => (
                  <div className="global-kpi-row" key={`monthly-${row.name}`}>
                    <span>{row.name}</span>
                    <strong>{formatCurrency(row.amount)}</strong>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>

      <div className="global-analytics-body">
        <section className="panel global-analytics-panel">
          <div className="global-kpi-header global-analytics-title">
            <h2>Investissements et payouts</h2>
          </div>
          <div className="global-bars-card">
            <div className="global-bar-plot">
              <div className="global-chart-scale" aria-hidden="true">
                {chartScaleRows.map((value) => (
                  <span key={value}>{compactAmount(value)}</span>
                ))}
              </div>
              <div className="global-bar-area">
                <div className="global-chart-axis-z" aria-hidden="true" />
                <div className="global-chart-grid-lines" aria-hidden="true">
                  {chartScaleRows.map((value) => (
                    <span key={value} />
                  ))}
                </div>
                <div className="global-bar-chart" aria-label="Investissements et payouts des 4 derniers mois">
                  {monthlyChartRows.map((row) => (
                    <div className="global-bar-month" key={`${row.year}-${row.month}`}>
                      <div className="global-bar-pair">
                        <div className="global-bar-slot">
                          <span className="global-bar-value">{formatCurrency(row.costs)}</span>
                          <div
                            aria-label={`Cout investi ${row.label}: ${formatCurrency(row.costs)}`}
                            className="global-bar cost"
                            style={{ height: barHeight(row.costs) }}
                            title={`Cout investi ${row.label}: ${formatCurrency(row.costs)}`}
                          />
                        </div>
                        <div className="global-bar-slot">
                          <span className="global-bar-value">{formatCurrency(row.payouts)}</span>
                          <div
                            aria-label={`Payouts ${row.label}: ${formatCurrency(row.payouts)}`}
                            className="global-bar payout"
                            style={{ height: barHeight(row.payouts) }}
                            title={`Payouts ${row.label}: ${formatCurrency(row.payouts)}`}
                          />
                        </div>
                      </div>
                      <strong>{row.label}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="global-chart-legend">
              <span><i className="legend-dot cost" />Cout investi</span>
              <span><i className="legend-dot payout" />Payouts</span>
            </div>
          </div>
        </section>

        <section className="panel global-pie-panel">
          <div className="global-pie-card">
            <div className="global-pie-head">
              <h3>Bilan annuel par propfirm</h3>
              <span>{formatCurrency(annualPieTotal)}</span>
            </div>
            <div className="global-pie-layout">
              <svg className="global-pie" viewBox="0 0 240 240" role="img" aria-label="Repartition annuelle par propfirm">
                {pieSlices.length === 0 ? (
                  <circle cx="120" cy="120" fill="#e5e7eb" r="92" stroke="#000" strokeWidth="1.25" />
                ) : (
                  pieSlices.map((slice) => (
                    <g key={`${slice.label}-${slice.startAngle.toFixed(2)}`}>
                      <path
                        d={describePieSlice(120, 120, 92, slice.startAngle, slice.endAngle)}
                        fill={darkenHexColor(slice.color, 0.38)}
                        transform={`translate(${slice.offsetX.toFixed(2)} ${(slice.offsetY + 7).toFixed(2)})`}
                      />
                      <path
                        d={describePieSlice(120, 120, 92, slice.startAngle, slice.endAngle)}
                        fill={slice.color}
                        stroke="#4b5563"
                        strokeLinejoin="round"
                        strokeWidth="0.75"
                        transform={`translate(${slice.offsetX.toFixed(2)} ${slice.offsetY.toFixed(2)})`}
                      />
                    </g>
                  ))
                )}
              </svg>
              <div className="global-pie-legend">
                {propFirmAnnualRows.length === 0 ? (
                  <p className="global-kpi-empty">Aucune donnée annuelle.</p>
                ) : (
                  propFirmAnnualRows.map((row, index) => {
                    const [costColor, payoutColor] = piePalette[index % piePalette.length];
                    const total = row.costs + row.payouts;
                    const percent = annualPieTotal > 0 ? (total / annualPieTotal) * 100 : 0;

                    return (
                      <div className="global-pie-row" key={row.name}>
                        <strong title={row.name}>{row.acronym}</strong>
                        <span>{percent.toFixed(0)}%</span>
                        <small><i style={{ background: costColor }} />Cout {formatCurrency(row.costs)}</small>
                        <small><i style={{ background: payoutColor }} />Payout {formatCurrency(row.payouts)}</small>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="global-analytics-body market-watch-row">
        <section className="panel global-analytics-panel market-watch-panel">
          <div className="global-pie-head">
            <h3>Suivi marchés</h3>
            <div className="chart-range-toggle market-range-toggle" aria-label="Unité de temps des graphiques">
              {marketRanges.map((range) => (
                <button
                  aria-pressed={marketRange === range.id}
                  className={marketRange === range.id ? "active" : ""}
                  key={range.id}
                  type="button"
                  onClick={() => setMarketRange(range.id)}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
          {selectedMarkets.length === 0 ? (
            <p className="global-kpi-empty">Sélectionne au moins une valeur à suivre.</p>
          ) : (
            <div className="market-chart-grid">
              {selectedMarkets.map((instrument) => {
                const isPositive = instrument.change >= 0;
                const rangePoints = marketRangePoints(instrument.points, marketRange);

                return (
                  <article className="market-card" key={instrument.id}>
                    <div className="market-card-head">
                      <div>
                        <strong>{instrument.displaySymbol}</strong>
                        <span className="market-card-name">{instrument.name}</span>
                        <small>{instrument.source} · {instrument.feedSymbol}</small>
                      </div>
                      <div className="market-price-block">
                        <strong>{formatMarketPrice(instrument.price)}</strong>
                        <span className={isPositive ? "tone-positive" : "tone-negative"}>
                          {isPositive ? "+" : ""}{instrument.change.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    <svg className="market-chart" viewBox="0 0 320 130" role="img" aria-label={`Graphique ${instrument.name}`}>
                      <defs>
                        <linearGradient id={`market-fill-${instrument.id}`} x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor={instrument.color} stopOpacity="0.28" />
                          <stop offset="100%" stopColor={instrument.color} stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <g className="market-grid-lines" aria-hidden="true">
                        <line x1="0" x2="320" y1="24" y2="24" />
                        <line x1="0" x2="320" y1="65" y2="65" />
                        <line x1="0" x2="320" y1="106" y2="106" />
                      </g>
                      {rangePoints.length === 0 ? (
                        <text className="market-chart-empty" x="160" y="70" textAnchor="middle">Données indisponibles</text>
                      ) : (
                        <>
                          <path d={marketAreaPath(rangePoints)} fill={`url(#market-fill-${instrument.id})`} />
                          <path d={marketPath(rangePoints)} fill="none" stroke={instrument.color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
                          <circle
                            cx="320"
                            cy={marketLastY(rangePoints)}
                            fill={instrument.color}
                            r="4"
                          />
                        </>
                      )}
                    </svg>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className="panel global-pie-panel market-selector-panel">
          <div className="global-pie-head">
            <h3>Valeurs à suivre</h3>
            <span>Watchlist</span>
          </div>
          <form className="market-add-row" onSubmit={searchMarket}>
            <input
              aria-label="Rechercher une valeur à suivre"
              placeholder="MNQ, MES, MCL..."
              value={marketSearchQuery}
              onChange={(event) => setMarketSearchQuery(event.currentTarget.value)}
            />
            <button
              className="button market-add-button"
              disabled={marketSearchQuery.trim().length < 2}
              type="submit"
            >
              Rechercher
            </button>
          </form>
          {marketStatus ? <p className="market-status">{marketStatus}</p> : null}
          {marketSearchResults.length > 0 ? (
            <div className="market-search-results">
              {marketSearchResults.map((instrument) => (
                <button
                  className="market-search-result"
                  key={`${instrument.source}-${instrument.symbol}`}
                  type="button"
                  onClick={() => addMarketInstrument(instrument)}
                >
                  <span>
                    <strong>{instrument.displaySymbol}</strong>
                    <small>{instrument.name}</small>
                  </span>
                  <em>{instrument.exchange ?? instrument.source}</em>
                </button>
              ))}
            </div>
          ) : null}
          <div className="market-selector-list">
            {watchedMarkets.map((instrument) => {
              const isSelected = selectedMarketSymbols.includes(instrument.symbol);

              return (
                <label
                  className={[
                    "market-selector-option",
                    isSelected ? "selected" : "",
                    draggedMarketId === instrument.id ? "dragging" : ""
                  ].filter(Boolean).join(" ")}
                  draggable
                  key={instrument.id}
                  onDragEnd={() => setDraggedMarketId(null)}
                  onDragOver={allowMarketDrop}
                  onDragStart={(event) => {
                    setDraggedMarketId(instrument.id);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", instrument.id);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    reorderMarketInstrument(instrument.id);
                    setDraggedMarketId(null);
                  }}
                >
                  <span className="market-drag-handle" aria-hidden="true">::</span>
                  <input
                    checked={isSelected}
                    type="checkbox"
                    onChange={() => {
                      setSelectedMarketSymbols((current) => (
                        current.includes(instrument.symbol)
                          ? current.filter((symbol) => symbol !== instrument.symbol)
                          : [...current, instrument.symbol]
                      ));
                    }}
                  />
                  <span className="market-selector-dot" style={{ background: instrument.color }} />
                  <span className="market-selector-main">
                    <strong>{instrument.displaySymbol}</strong>
                    <small>{instrument.name}</small>
                  </span>
                  <span className={(marketSeriesBySymbol[instrument.symbol]?.changePercent ?? 0) >= 0 ? "tone-positive" : "tone-negative"}>
                    {((marketSeriesBySymbol[instrument.symbol]?.changePercent ?? 0) >= 0) ? "+" : ""}
                    {(marketSeriesBySymbol[instrument.symbol]?.changePercent ?? 0).toFixed(2)}%
                  </span>
                  <button
                    aria-label={`Retirer ${instrument.name} de la watchlist`}
                    className="market-remove-button"
                    title="Retirer"
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      removeMarketInstrument(instrument);
                    }}
                  >
                    x
                  </button>
                </label>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
