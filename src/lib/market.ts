export type MarketRange = "1d" | "7d" | "1m" | "3m" | "6m";

export type MarketSearchResult = {
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

export type MarketSeries = {
  symbol: string;
  price: number | null;
  changePercent: number | null;
  points: number[];
  source: "YAHOO";
  updatedAt: string;
};

const YAHOO_SEARCH_URL = "https://query1.finance.yahoo.com/v1/finance/search";
const YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart";

const futureRoots: Record<string, { name: string; exchange: string; months: number[] }> = {
  MNQ: { name: "Micro E-mini Nasdaq-100 Futures", exchange: "CME", months: [3, 6, 9, 12] },
  MES: { name: "Micro E-mini S&P 500 Futures", exchange: "CME", months: [3, 6, 9, 12] },
  M2K: { name: "Micro E-mini Russell 2000 Futures", exchange: "CME", months: [3, 6, 9, 12] },
  MYM: { name: "Micro E-mini Dow Futures", exchange: "CBOT", months: [3, 6, 9, 12] },
  MCL: { name: "Micro WTI Crude Oil Futures", exchange: "NYMEX", months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  MGC: { name: "Micro Gold Futures", exchange: "COMEX", months: [2, 4, 6, 8, 10, 12] },
  SIL: { name: "Micro Silver Futures", exchange: "COMEX", months: [3, 5, 7, 9, 12] },
  ES: { name: "E-mini S&P 500 Futures", exchange: "CME", months: [3, 6, 9, 12] },
  NQ: { name: "E-mini Nasdaq-100 Futures", exchange: "CME", months: [3, 6, 9, 12] },
  CL: { name: "WTI Crude Oil Futures", exchange: "NYMEX", months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  GC: { name: "Gold Futures", exchange: "COMEX", months: [2, 4, 6, 8, 10, 12] }
};

const monthCodes = ["", "F", "G", "H", "J", "K", "M", "N", "Q", "U", "V", "X", "Z"];

const chartRanges: Record<MarketRange, { range: string; interval: string }> = {
  "1d": { range: "1d", interval: "5m" },
  "7d": { range: "7d", interval: "30m" },
  "1m": { range: "1mo", interval: "1d" },
  "3m": { range: "3mo", interval: "1d" },
  "6m": { range: "6mo", interval: "1d" }
};

const palette = ["#3b82f6", "#10b981", "#ef4444", "#6366f1", "#14b8a6", "#f97316", "#f59e0b", "#8b5cf6"];

export function marketColor(index: number) {
  return palette[index % palette.length];
}

function normalizedQuery(query: string) {
  return query.trim().toUpperCase().replace(/[^A-Z0-9.=^-]/g, "");
}

function activeFutureContract(root: string, now = new Date()) {
  const config = futureRoots[root];
  if (!config) {
    return null;
  }

  const rolloverDays = Number.parseInt(process.env.MARKET_FUTURES_ROLLOVER_DAYS ?? "7", 10);
  const current = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  for (let yearOffset = 0; yearOffset <= 2; yearOffset += 1) {
    const year = current.getUTCFullYear() + yearOffset;
    for (const month of config.months) {
      const expiryProxy = new Date(Date.UTC(year, month - 1, 15));
      const rolloverDate = new Date(expiryProxy);
      rolloverDate.setUTCDate(expiryProxy.getUTCDate() - rolloverDays);
      if (current < rolloverDate) {
        return {
          root,
          month,
          year,
          code: `${root}${monthCodes[month]}${String(year).slice(-2)}`,
          name: config.name,
          exchange: config.exchange
        };
      }
    }
  }

  return null;
}

function futureResult(query: string): MarketSearchResult | null {
  const root = normalizedQuery(query).replace(/=F$/, "");
  const contract = activeFutureContract(root);
  if (!contract) {
    return null;
  }

  return {
    query,
    symbol: `${root}=F`,
    displaySymbol: contract.code,
    name: `${contract.name} (${contract.code})`,
    exchange: contract.exchange,
    quoteType: "FUTURE",
    instrumentType: "FUTURE",
    contractRoot: root,
    activeContractCode: contract.code,
    activeContractMonth: contract.month,
    activeContractYear: contract.year,
    feedSymbol: `${contract.exchange}:${contract.code}`,
    source: "YAHOO"
  };
}

function yahooResult(query: string, quote: Record<string, unknown>): MarketSearchResult | null {
  const symbol = typeof quote.symbol === "string" ? quote.symbol : "";
  const name = typeof quote.shortname === "string"
    ? quote.shortname
    : typeof quote.longname === "string"
      ? quote.longname
      : symbol;

  if (!symbol) {
    return null;
  }

  const quoteType = typeof quote.quoteType === "string" ? quote.quoteType : null;
  const exchange = typeof quote.exchange === "string" ? quote.exchange : null;

  return {
    query,
    symbol,
    displaySymbol: symbol,
    name,
    exchange,
    quoteType,
    instrumentType: quoteType === "FUTURE" ? "FUTURE" : quoteType ?? "MARKET",
    contractRoot: null,
    activeContractCode: null,
    activeContractMonth: null,
    activeContractYear: null,
    feedSymbol: exchange ? `${exchange}:${symbol}` : symbol,
    source: "YAHOO"
  };
}

export async function searchMarketSymbols(query: string): Promise<MarketSearchResult[]> {
  const normalized = normalizedQuery(query);
  if (normalized.length < 2) {
    return [];
  }

  const directFuture = futureResult(normalized);
  const params = new URLSearchParams({ q: normalized, quotesCount: "8", newsCount: "0" });
  const response = await fetch(`${YAHOO_SEARCH_URL}?${params.toString()}`, {
    headers: { accept: "application/json" },
    next: { revalidate: 60 }
  });

  if (!response.ok) {
    return directFuture ? [directFuture] : [];
  }

  const data = await response.json() as { quotes?: Array<Record<string, unknown>> };
  const yahooResults = (data.quotes ?? [])
    .map((quote) => yahooResult(normalized, quote))
    .filter((result): result is MarketSearchResult => result !== null);

  const results = directFuture ? [directFuture, ...yahooResults] : yahooResults;
  const seen = new Set<string>();

  return results.filter((result) => {
    if (seen.has(result.symbol)) {
      return false;
    }
    seen.add(result.symbol);
    return true;
  });
}

export async function getMarketSeries(symbol: string, range: MarketRange): Promise<MarketSeries> {
  const config = chartRanges[range] ?? chartRanges["7d"];
  const params = new URLSearchParams({
    range: config.range,
    interval: config.interval,
    includePrePost: "true"
  });
  const response = await fetch(`${YAHOO_CHART_URL}/${encodeURIComponent(symbol)}?${params.toString()}`, {
    headers: { accept: "application/json" },
    next: { revalidate: range === "1d" ? 30 : 300 }
  });

  if (!response.ok) {
    return { symbol, price: null, changePercent: null, points: [], source: "YAHOO", updatedAt: new Date().toISOString() };
  }

  const data = await response.json() as {
    chart?: {
      result?: Array<{
        meta?: { regularMarketPrice?: number; chartPreviousClose?: number; previousClose?: number };
        indicators?: { quote?: Array<{ close?: Array<number | null> }> };
      }>;
    };
  };
  const result = data.chart?.result?.[0];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];
  const points = closes.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const price = result?.meta?.regularMarketPrice ?? points[points.length - 1] ?? null;
  const previous = result?.meta?.chartPreviousClose ?? result?.meta?.previousClose ?? points[0] ?? null;
  const changePercent = price !== null && previous !== null && previous !== 0
    ? ((price - previous) / previous) * 100
    : null;

  return {
    symbol,
    price,
    changePercent,
    points: points.slice(-80),
    source: "YAHOO",
    updatedAt: new Date().toISOString()
  };
}
