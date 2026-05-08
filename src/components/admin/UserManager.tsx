"use client";

import { useFormStatus } from "react-dom";
import { deleteUser, updateUserAdminRole } from "@/server/actions/auth-actions";
import type { UserSummary } from "@/types";

type UserManagerProps = {
  users: UserSummary[];
  currentUserId: string;
};

function roleLabel(role: string) {
  return role === "ADMIN" ? "admin" : "utilisateur";
}

function formatRegistrationDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

function formatNullableDate(value: string | null) {
  return value ? formatRegistrationDate(value) : "-";
}

function AdminCheckbox({ defaultChecked, disabled }: { defaultChecked: boolean; disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <input
      aria-label="Role admin"
      defaultChecked={defaultChecked}
      disabled={disabled || pending}
      name="isAdmin"
      type="checkbox"
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
    />
  );
}

function DeleteUserButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-label="Supprimer l'utilisateur"
      className="row-icon-button danger"
      disabled={disabled || pending}
      title={disabled ? "Impossible de supprimer votre propre utilisateur" : "Supprimer l'utilisateur"}
      type="submit"
    >
      🗑️
    </button>
  );
}

export function UserManager({ users, currentUserId }: UserManagerProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Gestion des utilisateurs</h2>
        <span className="muted">{users.length} utilisateurs</span>
      </div>

      {users.length === 0 ? (
        <p className="empty-state">Aucun utilisateur actif.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Mail</th>
                <th>Date creation</th>
                <th>Derniere connexion</th>
                <th>Admin</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.name}</strong>
                  </td>
                  <td>{user.email}</td>
                  <td>{formatRegistrationDate(user.createdAt)}</td>
                  <td>{formatNullableDate(user.lastLoginAt)}</td>
                  <td>
                    <form action={updateUserAdminRole} className="inline-admin-form">
                      <input name="userId" type="hidden" value={user.id} />
                      <label className="check-field compact-check">
                        <AdminCheckbox defaultChecked={user.role === "ADMIN"} disabled={user.id === currentUserId} />
                        <span>{roleLabel(user.role)}</span>
                      </label>
                    </form>
                  </td>
                  <td>
                    <form
                      action={deleteUser}
                      className="inline-admin-form"
                      onSubmit={(event) => {
                        if (!window.confirm(`Supprimer ${user.name} ?`)) {
                          event.preventDefault();
                        }
                      }}
                    >
                      <input name="userId" type="hidden" value={user.id} />
                      <DeleteUserButton disabled={user.id === currentUserId} />
                    </form>
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
