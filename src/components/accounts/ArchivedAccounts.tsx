"use client";

import { formatCurrency } from "@/lib/format";
import type { AccountSummary, AppView } from "@/types";

type ArchivedAccountsProps = {
  accounts: AccountSummary[];
  onOpenAccount: (view: AppView) => void;
};

export function ArchivedAccounts({ accounts, onOpenAccount }: ArchivedAccountsProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Comptes archives</h2>
        <span className="muted">{accounts.length} comptes</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Compte</th>
              <th>Prop firm</th>
              <th>Type</th>
              <th>Solde</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.id}>
                <td>{account.accountNumber ? `#${account.accountNumber}` : "Sans numero"}</td>
                <td>{account.propFirmAcronym}</td>
                <td>{account.accountType}</td>
                <td>{formatCurrency(account.accountBalanceUsd)}</td>
                <td>
                  <button className="button secondary" type="button" onClick={() => onOpenAccount(`account:${account.id}`)}>
                    Ouvrir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
