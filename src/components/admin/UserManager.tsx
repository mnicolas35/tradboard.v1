"use client";

import { useFormStatus } from "react-dom";
import { deleteUser, updateUserRole } from "@/server/actions/auth-actions";
import type { UserSummary } from "@/types";

type UserManagerProps = {
  users: UserSummary[];
  currentUserId: string;
};

function roleLabel(role: string) {
  if (role === "ADMIN") return "Admin";
  if (role === "CONTRIBUTOR") return "Contributeur";
  return "Utilisateur";
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

function RoleSelect({ defaultValue, disabled }: { defaultValue: string; disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <select
      aria-label="Role utilisateur"
      defaultValue={defaultValue}
      disabled={disabled || pending}
      name="role"
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
    >
      <option value="USER">Utilisateur</option>
      <option value="ADMIN">Admin</option>
      <option value="CONTRIBUTOR">Contributeur</option>
    </select>
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
          <table className="compact-table user-manager-table">
            <colgroup>
              <col />
              <col />
              <col />
              <col />
              <col className="current-role-column" />
              <col className="role-selection-column" />
              <col />
            </colgroup>
            <thead>
              <tr>
                <th>User</th>
                <th>Mail</th>
                <th>Date creation</th>
                <th>Date connexion</th>
                <th>Role user</th>
                <th>Modification</th>
                <th>Action</th>
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
                  <td className="current-role-cell">
                    <span className="role-pill">{roleLabel(user.role)}</span>
                  </td>
                  <td className="role-selection-cell">
                    <form action={updateUserRole} className="inline-admin-form">
                      <input name="userId" type="hidden" value={user.id} />
                      <label className="compact-field role-select-field">
                        <span className="sr-only">Role a appliquer</span>
                        <RoleSelect defaultValue={user.role} disabled={user.id === currentUserId} />
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
