"use client";

import type { AccountSummary, AppView } from "@/types";

type SidebarProps = {
  accounts: AccountSummary[];
  propFirmOrders: Record<string, number>;
  currentView: AppView;
  onChangeView: (view: AppView) => void;
};

function accountBadge(account: AccountSummary) {
  if (account.payoutEligibility.isEligible) {
    return "💰";
  }

  if (account.rule?.maxDrawdown && account.currentResultUsd < -account.rule.maxDrawdown * 0.75) {
    return "⚠️";
  }

  if (account.status === "FAILED") {
    return "🔴";
  }

  if (account.accountType === "EVALUATION") {
    return "🟡";
  }

  return "🟢";
}

function compactSize(value: number) {
  return value >= 1000 ? `${Math.round(value / 1000)}k` : String(value);
}

export function Sidebar({ accounts, propFirmOrders, currentView, onChangeView }: SidebarProps) {
  const groups = Object.entries(
    accounts.reduce<Record<string, { acronym: string; accounts: AccountSummary[]; order: number }>>((acc, account) => {
      acc[account.propFirmId] ??= {
        acronym: account.propFirmAcronym,
        accounts: [],
        order: propFirmOrders[account.propFirmId] ?? Number.MAX_SAFE_INTEGER
      };
      acc[account.propFirmId].accounts.push(account);
      return acc;
    }, {})
  )
    .map(([propFirmId, group]) => ({ propFirmId, ...group }))
    .sort((a, b) => a.order - b.order || a.acronym.localeCompare(b.acronym));

  return (
    <aside className="sidebar">
      <button
        className={currentView === "dashboard" ? "sidebar-item sidebar-dashboard active" : "sidebar-item sidebar-dashboard"}
        type="button"
        onClick={() => onChangeView("dashboard")}
      >
        <span>Dashboard</span>
      </button>

      <section className="sidebar-section accounts-section">
        <div className="sidebar-heading">Comptes</div>
        <div className="sidebar-list accounts-list">
          {groups.length === 0 ? (
            <p className="sidebar-empty">Aucun compte actif.</p>
          ) : (
            groups.map((group) => (
              <div className="sidebar-account-group" key={group.propFirmId}>
                <div className="sidebar-account-group-title">{group.acronym}</div>
                {group.accounts.map((account) => {
                  const view = `account:${account.id}` as AppView;
              return (
                <button
                  className={currentView === view ? "sidebar-item account-nav-item active" : "sidebar-item account-nav-item"}
                  key={account.id}
                  type="button"
                  onClick={() => onChangeView(view)}
                >
                  <span>
                    {compactSize(account.accountSize)} {account.accountNumber ? `#${account.accountNumber}` : account.name}
                  </span>
                  <small>
                    {account.currentResultUsd >= 0 ? "+" : ""}${account.currentResultUsd.toFixed(0)} {accountBadge(account)}
                  </small>
                </button>
              );
                })}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="sidebar-section nav-section">
        <button
          className={currentView === "archived-accounts" ? "sidebar-item active" : "sidebar-item"}
          type="button"
          onClick={() => onChangeView("archived-accounts")}
        >
          <span>Comptes archivés</span>
        </button>
      </section>

      <section className="sidebar-section nav-section">
        <button
          className={currentView === "prop-firms" ? "sidebar-item active" : "sidebar-item"}
          type="button"
          onClick={() => onChangeView("prop-firms")}
        >
          <span>PropFirm</span>
        </button>
      </section>
    </aside>
  );
}
