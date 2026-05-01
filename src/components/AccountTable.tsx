import type { Account, PropFirm, PropFirmRule } from "@prisma/client";
import { formatCurrency, formatDate } from "@/lib/format";

type AccountWithRelations = Account & {
  propFirm: PropFirm;
  propFirmRule: PropFirmRule | null;
};

type AccountTableProps = {
  accounts: AccountWithRelations[];
};

export function AccountTable({ accounts }: AccountTableProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Comptes</h2>
        <span className="muted">{accounts.length} comptes</span>
      </div>

      {accounts.length === 0 ? (
        <p className="empty-state">Aucun compte pour le moment.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Compte</th>
                <th>Prop firm</th>
                <th>Type</th>
                <th>Taille</th>
                <th>Statut</th>
                <th>Achat</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td>
                    <strong>{account.name}</strong>
                    {account.propFirmRule ? (
                      <div className="muted">{account.propFirmRule.name}</div>
                    ) : null}
                  </td>
                  <td>{account.propFirm.name}</td>
                  <td>{account.accountType}</td>
                  <td>{formatCurrency(Number(account.accountSize))}</td>
                  <td>
                    <span
                      className={
                        account.status === "ACTIVE" ? "status status-active" : "status"
                      }
                    >
                      {account.status}
                    </span>
                  </td>
                  <td>
                    {account.purchaseDate ? formatDate(account.purchaseDate) : "-"}
                    {account.purchasePrice ? (
                      <div className="muted">
                        {formatCurrency(Number(account.purchasePrice))}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
