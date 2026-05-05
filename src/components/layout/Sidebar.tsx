"use client";

import { useState } from "react";
import type { AccountSummary, AppView } from "@/types";

type SidebarProps = {
  accounts: AccountSummary[];
  archivedAccounts: AccountSummary[];
  propFirmOrders: Record<string, number>;
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  onOpenAccount: () => void;
};

type AccountGroup = {
  propFirmId: string;
  acronym: string;
  accounts: AccountSummary[];
  order: number;
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

function archiveBadge(sectionKey?: string) {
  if (sectionKey === "passed") {
    return "🟢";
  }

  if (sectionKey === "failed") {
    return "⚠️";
  }

  if (sectionKey === "funded") {
    return "🔴";
  }

  return null;
}

function compactSize(value: number) {
  return value >= 1000 ? `${Math.round(value / 1000)}k` : String(value);
}

function accountTitle(account: AccountSummary) {
  return account.accountNumber ? `#${account.accountNumber}` : "Sans numero";
}

function groupAccounts(accounts: AccountSummary[], propFirmOrders: Record<string, number>): AccountGroup[] {
  return Object.entries(
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
}

function collapseKey(sectionKey: string, propFirmId: string) {
  return `${sectionKey}:${propFirmId}`;
}

function SidebarAccountButton({
  account,
  badge,
  currentView,
  onChangeView
}: {
  account: AccountSummary;
  badge?: string | null;
  currentView: AppView;
  onChangeView: (view: AppView) => void;
}) {
  const view = `account:${account.id}` as AppView;

  return (
    <button
      className={currentView === view ? "sidebar-item account-nav-item active" : "sidebar-item account-nav-item"}
      type="button"
      onClick={() => onChangeView(view)}
    >
      <span className="account-nav-main">
        <span className="account-nav-badge" aria-hidden="true">{badge ?? accountBadge(account)}</span>
        <span className="account-nav-title">
          {compactSize(account.accountSize)} {accountTitle(account)}
        </span>
      </span>
      <small>${account.accountBalanceUsd.toFixed(0)}</small>
    </button>
  );
}

export function Sidebar({ accounts, archivedAccounts, propFirmOrders, currentView, onChangeView, onOpenAccount }: SidebarProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [collapsedArchiveSections, setCollapsedArchiveSections] = useState<Set<string>>(
    () => new Set(["passed", "failed", "funded"])
  );
  const groups = groupAccounts(accounts, propFirmOrders);
  const fundedParentIds = new Set(archivedAccounts.filter((account) => account.accountType === "FUNDED" && account.parentAccountId).map((account) => account.parentAccountId));
  const passedEvaluations = archivedAccounts.filter(
    (account) =>
      account.accountType === "EVALUATION" &&
      (account.status === "PASSED" || (account.status === "ARCHIVED" && fundedParentIds.has(account.id)))
  );
  const failedEvaluations = archivedAccounts.filter(
    (account) => account.accountType === "EVALUATION" && (account.status === "FAILED" || account.status === "CLOSED")
  );
  const closedFunded = archivedAccounts.filter(
    (account) => account.accountType === "FUNDED" && (account.status === "CLOSED" || account.status === "ARCHIVED")
  );
  const passedGroups = groupAccounts(passedEvaluations, propFirmOrders);
  const failedGroups = groupAccounts(failedEvaluations, propFirmOrders);
  const closedFundedGroups = groupAccounts(closedFunded, propFirmOrders);

  function toggleGroup(sectionKey: string, propFirmId: string) {
    const key = collapseKey(sectionKey, propFirmId);

    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function toggleArchiveSection(sectionKey: string) {
    setCollapsedArchiveSections((current) => {
      const next = new Set(current);
      if (next.has(sectionKey)) {
        next.delete(sectionKey);
      } else {
        next.add(sectionKey);
      }
      return next;
    });
  }

  function renderAccountGroups(sectionKey: string, groupsToRender: AccountGroup[], keyPrefix = sectionKey) {
    const badge = archiveBadge(sectionKey);

    return groupsToRender.map((group) => {
      const key = collapseKey(sectionKey, group.propFirmId);
      const isCollapsed = collapsedGroups.has(key);

      return (
        <div className="sidebar-account-group" key={`${keyPrefix}-${group.propFirmId}`}>
          <button
            aria-expanded={!isCollapsed}
            className="sidebar-account-group-title"
            type="button"
            onClick={() => toggleGroup(sectionKey, group.propFirmId)}
          >
            <span>{group.acronym}</span>
            <span aria-hidden="true">{isCollapsed ? "▸" : "▾"}</span>
          </button>
          {isCollapsed
            ? null
            : group.accounts.map((account) => (
                <SidebarAccountButton account={account} badge={badge} currentView={currentView} key={account.id} onChangeView={onChangeView} />
              ))}
        </div>
      );
    });
  }

  function renderArchiveBlock(sectionKey: string, label: string, total: number, emptyLabel: string, groupsToRender: AccountGroup[]) {
    const isCollapsed = collapsedArchiveSections.has(sectionKey);

    return (
      <div className="sidebar-archive-block">
        <button
          aria-expanded={!isCollapsed}
          className="sidebar-archive-heading"
          type="button"
          onClick={() => toggleArchiveSection(sectionKey)}
        >
          <span>{label}</span>
          <span className="sidebar-archive-meta">
            <strong>{total}</strong>
            <span aria-hidden="true">{isCollapsed ? "▸" : "▾"}</span>
          </span>
        </button>
        {isCollapsed ? null : groupsToRender.length === 0 ? (
          <p className="sidebar-empty">{emptyLabel}</p>
        ) : (
          renderAccountGroups(sectionKey, groupsToRender)
        )}
      </div>
    );
  }

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
        <div className="sidebar-heading sidebar-heading-row">
          <span>Comptes</span>
          <button
            aria-label="Add compte utilisateur"
            className="sidebar-plus-button"
            title="Add compte utilisateur"
            type="button"
            onClick={onOpenAccount}
          >
            <span aria-hidden="true">+</span>
          </button>
        </div>
        <div className="sidebar-list accounts-list">
          {groups.length === 0 ? (
            <p className="sidebar-empty">Aucun compte actif.</p>
          ) : (
            renderAccountGroups("accounts", groups, "active")
          )}
        </div>
      </section>

      <section className="sidebar-section nav-section">
        {renderArchiveBlock("passed", "Évaluations validées", passedEvaluations.length, "Aucune évaluation.", passedGroups)}
        {renderArchiveBlock("failed", "Évaluations ratées", failedEvaluations.length, "Aucune évaluation.", failedGroups)}
        {renderArchiveBlock("funded", "Funded closed", closedFunded.length, "Aucun funded.", closedFundedGroups)}
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
