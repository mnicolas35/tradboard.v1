import { TradBoardApp } from "@/components/TradBoardApp";
import { getDashboardData } from "@/server/dashboard";

export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await getDashboardData();

  return <TradBoardApp data={data} />;
}
