"use client";

type TopBarProps = {
  isAuthenticated: boolean;
  user?: {
    name: string;
    email: string;
    role: string;
  };
  onOpenSettings?: () => void;
  onLogout?: () => void;
};

export function TopBar({ isAuthenticated, user, onOpenSettings, onLogout }: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="brand">
        <div className="brand-mark">TB</div>
        <div>
          <div className="brand-title">TradBoard</div>
          <div className="brand-subtitle">Prop firm trading dashboard</div>
        </div>
      </div>

      {isAuthenticated && user ? (
        <div className="user-strip">
          <div>
            <strong>{user.name}</strong>
            <span>{user.role} - {user.email}</span>
          </div>
          <button className="button secondary" type="button" onClick={onOpenSettings}>
            Parametres
          </button>
          <button className="button secondary" type="button" onClick={onLogout}>
            Deconnexion
          </button>
        </div>
      ) : null}
    </header>
  );
}
