"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { useSearchParams } from "next/navigation";
import { loginUser, registerUser } from "@/server/actions/auth-actions";
import { TopBar } from "@/components/layout/TopBar";

const authErrors: Record<string, string> = {
  google_account_conflict: "Ce compte email est deja lie a un autre compte Google.",
  google_config: "La connexion Google n'est pas encore configuree sur le serveur.",
  google_email: "Google n'a pas confirme l'adresse email du compte.",
  google_login: "La connexion Google a echoue.",
  google_state: "La session de connexion Google a expire. Relancez la connexion."
};

export function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const searchParams = useSearchParams();
  const [loginError, loginAction] = useFormState(loginUser, null);
  const [registerError, registerAction] = useFormState(registerUser, null);
  const isRegister = mode === "register";
  const googleError = authErrors[searchParams.get("authError") ?? ""];

  return (
    <main className="login-page">
      <TopBar />
      <section className="login-panel">
        <div className="login-card">
          <div className="panel-header flush-header">
            <h1>{isRegister ? "Inscription" : "Connexion"}</h1>
          </div>
          <a className="button google-button wide-button" href="/api/auth/google">
            <span className="google-mark">G</span>
            <span>Continuer avec Google</span>
          </a>
          <div className="auth-separator">
            <span />
            <strong>ou</strong>
            <span />
          </div>
          <form action={isRegister ? registerAction : loginAction}>
            <label className="form-field wide">
              <span>Email</span>
              <input autoComplete="username" name="email" required type="text" />
            </label>
            <label className="form-field wide">
              <span>Mot de passe</span>
              <input autoComplete={isRegister ? "new-password" : "current-password"} name="password" required type="password" />
            </label>
            {isRegister && registerError ? <p className="form-error">{registerError}</p> : null}
            {!isRegister && loginError ? <p className="form-error">{loginError}</p> : null}
            {googleError ? <p className="form-error">{googleError}</p> : null}
            <button className="button wide-button" type="submit">
              {isRegister ? "Creer le compte" : "Connexion"}
            </button>
            <button className="button secondary wide-button" type="button" onClick={() => setMode(isRegister ? "login" : "register")}>
              {isRegister ? "J'ai deja un compte" : "Inscription"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
