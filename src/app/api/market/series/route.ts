import { NextResponse } from "next/server";
import { getMarketSeries, type MarketRange } from "@/lib/market";
import { getOptionalCurrentUser } from "@/server/auth/current-user";

const ranges = new Set(["1d", "7d", "1m", "3m", "6m"]);

export async function GET(request: Request) {
  const currentUser = await getOptionalCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Non connecte." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const symbols = (searchParams.get("symbols") ?? "")
    .split(",")
    .map((symbol) => symbol.trim())
    .filter(Boolean)
    .slice(0, 12);
  const requestedRange = searchParams.get("range") ?? "7d";
  const range: MarketRange = ranges.has(requestedRange) ? (requestedRange as MarketRange) : "7d";
  const series = await Promise.all(symbols.map((symbol) => getMarketSeries(symbol, range)));

  return NextResponse.json({ series });
}
