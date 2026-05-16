import { NextResponse } from "next/server";
import { searchMarketSymbols } from "@/lib/market";
import { getOptionalCurrentUser } from "@/server/auth/current-user";

export async function GET(request: Request) {
  const currentUser = await getOptionalCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Non connecte." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const results = await searchMarketSymbols(query);

  return NextResponse.json({ results });
}
