"use client";

import { useMemo, useState } from "react";
import { AccountDetail } from "@/components/accounts/AccountDetail";
import { UserManager } from "@/components/admin/UserManager";
import { ArchivedAccounts } from "@/components/accounts/ArchivedAccounts";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { ExchangeRateForm } from "@/components/forms/ExchangeRateForm";
import { ExpenseForm } from "@/components/forms/ExpenseForm";
import { PayoutForm } from "@/components/forms/PayoutForm";
import { TradingDayForm } from "@/components/forms/TradingDayForm";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { AddAccountModal } from "@/components/modals/AddAccountModal";
import { UserSettings } from "@/components/settings/UserSettings";
import { PropFirmManager } from "@/components/propfirms/PropFirmManager";
import type { AppData, AppView } from "@/types";

type TradBoardAppProps = {
  data: AppData;
};

export function TradBoardApp({ data }: TradBoardAppProps) {
  const [view, setView] = useState<AppView>("dashboard");
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const isAdmin = data.currentUser.role === "ADMIN";
  const canManageSharedPropFirmRules = isAdmin || data.currentUser.role === "CONTRIBUTOR";

  const selectedAccount = useMemo(() => {
    if (!view.startsWith("account:")) {
      return null;
    }

    return data.accounts.find((account) => account.id === view.split(":")[1]) ?? null;
  }, [data.accounts, view]);

  let content = <DashboardOverview data={data} />;

  if (selectedAccount) {
    content = <AccountDetail account={selectedAccount} />;
  } else if (view === "archived-accounts") {
    content = <ArchivedAccounts accounts={data.archivedAccounts} onOpenAccount={setView} />;
  } else if (view === "prop-firms") {
    content = (
      <PropFirmManager
        propFirms={data.propFirmDetails}
        propFirmRules={data.propFirmRules}
        isAdmin={isAdmin}
        canManageSharedRules={canManageSharedPropFirmRules}
        currentUserId={data.currentUser.id}
      />
    );
  } else if (view === "user-management") {
    content = isAdmin ? <UserManager users={data.users} currentUserId={data.currentUser.id} /> : <DashboardOverview data={data} />;
  } else if (view === "settings") {
    content = <UserSettings user={data.currentUser} />;
  } else if (view === "trading-day") {
    content = <TradingDayForm accounts={data.activeAccounts} />;
  } else if (view === "expense") {
    content = <ExpenseForm accounts={data.accounts} />;
  } else if (view === "payout") {
    content = <PayoutForm accounts={data.accounts} />;
  } else if (view === "exchange-rates") {
    content = <ExchangeRateForm rates={data.exchangeRates} />;
  }

  return (
    <main className="app-shell" data-theme={data.currentUser.themePreference.toLowerCase()}>
      <TopBar
        user={data.currentUser}
        onOpenSettings={() => setView("settings")}
      />
      <div className="app-layout">
        <Sidebar
          accounts={data.activeAccounts}
          archivedAccounts={data.accounts}
          propFirmOrders={data.propFirmOrders}
          isAdmin={isAdmin}
          currentView={view}
          onChangeView={setView}
          onOpenAccount={() => setAccountModalOpen(true)}
        />
        <section className="workspace">{content}</section>
      </div>
      <AddAccountModal
        isOpen={accountModalOpen}
        title="Ajouter un compte"
        propFirms={data.propFirms}
        propFirmRules={data.propFirmRules}
        onClose={() => setAccountModalOpen(false)}
      />
    </main>
  );
}
