import { NextResponse } from "next/server";
import { marketColor, type MarketSearchResult } from "@/lib/market";
import { prisma } from "@/lib/prisma";
import { getOptionalCurrentUser } from "@/server/auth/current-user";

export async function POST(request: Request) {
  const currentUser = await getOptionalCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Non connecte." }, { status: 401 });
  }

  const payload = await request.json() as { instrument?: MarketSearchResult };
  const instrument = payload.instrument;

  if (!instrument?.symbol || !instrument.displaySymbol || !instrument.name) {
    return NextResponse.json({ error: "Instrument invalide." }, { status: 400 });
  }

  const count = await prisma.marketWatchItem.count({ where: { userId: currentUser.id } });
  const item = await prisma.marketWatchItem.upsert({
    where: { userId_symbol: { userId: currentUser.id, symbol: instrument.symbol } },
    update: {
      query: instrument.query,
      displaySymbol: instrument.displaySymbol,
      name: instrument.name,
      exchange: instrument.exchange,
      quoteType: instrument.quoteType,
      instrumentType: instrument.instrumentType,
      contractRoot: instrument.contractRoot,
      activeContractCode: instrument.activeContractCode,
      activeContractMonth: instrument.activeContractMonth,
      activeContractYear: instrument.activeContractYear,
      feedSymbol: instrument.feedSymbol,
      source: instrument.source
    },
    create: {
      userId: currentUser.id,
      query: instrument.query,
      symbol: instrument.symbol,
      displaySymbol: instrument.displaySymbol,
      name: instrument.name,
      exchange: instrument.exchange,
      quoteType: instrument.quoteType,
      instrumentType: instrument.instrumentType,
      contractRoot: instrument.contractRoot,
      activeContractCode: instrument.activeContractCode,
      activeContractMonth: instrument.activeContractMonth,
      activeContractYear: instrument.activeContractYear,
      feedSymbol: instrument.feedSymbol,
      source: instrument.source,
      color: marketColor(count),
      sortOrder: count
    }
  });

  return NextResponse.json({ item });
}

export async function PATCH(request: Request) {
  const currentUser = await getOptionalCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Non connecte." }, { status: 401 });
  }

  const payload = await request.json() as { orderedIds?: string[] };
  const orderedIds = Array.isArray(payload.orderedIds)
    ? payload.orderedIds.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];

  if (orderedIds.length === 0) {
    return NextResponse.json({ error: "Ordre invalide." }, { status: 400 });
  }

  await prisma.$transaction(
    orderedIds.map((id, sortOrder) => (
      prisma.marketWatchItem.updateMany({
        where: {
          id,
          userId: currentUser.id
        },
        data: { sortOrder }
      })
    ))
  );

  return NextResponse.json({ ok: true });
}
