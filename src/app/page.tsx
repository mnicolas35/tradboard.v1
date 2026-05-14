import { Suspense } from "react";
import { AuthPage } from "@/components/auth/AuthPage";
import { TradBoardApp } from "@/components/TradBoardApp";
import { getOptionalCurrentUser } from "@/server/auth/current-user";
import { getDashboardData } from "@/server/dashboard";

export const dynamic = "force-dynamic";

export default async function Page() {
  const currentUser = await getOptionalCurrentUser();

  if (!currentUser) {
    return (
      <Suspense>
        <AuthPage />
      </Suspense>
    );
  }

  const data = await getDashboardData();

  return <TradBoardApp data={data} />;
}
