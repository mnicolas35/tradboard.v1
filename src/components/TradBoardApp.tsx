"use client";

import { useMemo, useState } from "react";
import { AccountDetail } from "@/components/accounts/AccountDetail";
import { ArchivedAccounts } from "@/components/accounts/ArchivedAccounts";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { ExchangeRateForm } from "@/components/forms/ExchangeRateForm";
import { ExpenseForm } from "@/components/forms/ExpenseForm";
import { PayoutForm } from "@/components/forms/PayoutForm";
import { TradingDayForm } from "@/components/forms/TradingDayForm";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { UserSettings } from "@/components/settings/UserSettings";
import { PropFirmManager } from "@/components/propfirms/PropFirmManager";
import type { AppData, AppView } from "@/types";

type TradBoardAppProps = {
  data: AppData;
};

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  return (
    <main className="login-page">
      <TopBar isAuthenticated={false} />
      <section className="login-panel">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onLogin();
          }}
        >
          <h1>Connexion TradBoard</h1>
          <label className="form-field wide">
            <span>Email / user</span>
            <input defaultValue="admin@tradboard.local" name="email" required type="email" />
          </label>
          <label className="form-field wide">
            <span>Password</span>
            <input defaultValue="demo" name="password" required type="password" />
          </label>
          <button className="button wide-button" type="submit">
            Connexion
          </button>
        </form>
      </section>
    </main>
  );
}

export function TradBoardApp({ data }: TradBoardAppProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [view, setView] = useState<AppView>("dashboard");

  const selectedAccount = useMemo(() => {
    if (!view.startsWith("account:")) {
      return null;
    }

    return data.accounts.find((account) => account.id === view.split(":")[1]) ?? null;
  }, [data.accounts, view]);

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  let content = <DashboardOverview data={data} />;

  if (selectedAccount) {
    content = <AccountDetail account={selectedAccount} />;
  } else if (view === "archived-accounts") {
    content = <ArchivedAccounts accounts={data.archivedAccounts} onOpenAccount={setView} />;
  } else if (view === "prop-firms") {
    content = (
      <PropFirmManager
        accounts={data.accounts}
        propFirms={data.propFirmDetails}
        propFirmRules={data.propFirmRules}
        isAdmin={data.currentUser.role === "ADMIN"}
        currentUserId={data.currentUser.id}
      />
    );
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
        isAuthenticated
        user={data.currentUser}
        onOpenSettings={() => setView("settings")}
        onLogout={() => {
          setIsAuthenticated(false);
          setView("dashboard");
        }}
      />
      <div className="app-layout">
        <Sidebar
          accounts={data.activeAccounts}
          propFirmOrders={data.propFirmOrders}
          currentView={view}
          onChangeView={setView}
        />
        <section className="workspace">{content}</section>
      </div>
    </main>
  );
}
