import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptionalCurrentUser } from "@/server/auth/current-user";

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const currentUser = await getOptionalCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Non connecte." }, { status: 401 });
  }

  await prisma.marketWatchItem.deleteMany({
    where: {
      id: params.id,
      userId: currentUser.id
    }
  });

  return NextResponse.json({ ok: true });
}
