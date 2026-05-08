"use client";

import { logoutUser } from "@/server/actions/auth-actions";

type TopBarProps = {
  user?: {
    name: string;
    email: string;
    role: string;
  };
  onOpenSettings?: () => void;
};

export function TopBar({ user, onOpenSettings }: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="brand">
        <div className="brand-mark">TB</div>
        <div>
          <div className="brand-title">TradBoard</div>
          <div className="brand-subtitle">Prop firm trading dashboard</div>
        </div>
      </div>

      {user ? (
        <div className="user-strip">
          <div>
            <strong>{user.name}</strong>
            <span>{user.role} - {user.email}</span>
          </div>
          <button className="button secondary" type="button" onClick={onOpenSettings}>
            Parametres
          </button>
          <form action={logoutUser}>
            <button className="button secondary" type="submit">
              Deconnexion
            </button>
          </form>
        </div>
      ) : null}
    </header>
  );
}
