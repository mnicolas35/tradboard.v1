"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { loginUser, registerUser } from "@/server/actions/auth-actions";
import { TopBar } from "@/components/layout/TopBar";

export function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginError, loginAction] = useFormState(loginUser, null);
  const [registerError, registerAction] = useFormState(registerUser, null);
  const isRegister = mode === "register";

  return (
    <main className="login-page">
      <TopBar />
      <section className="login-panel">
        <form action={isRegister ? registerAction : loginAction}>
          <div className="panel-header flush-header">
            <h1>{isRegister ? "Inscription" : "Connexion"}</h1>
          </div>
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
          <button className="button wide-button" type="submit">
            {isRegister ? "Creer le compte" : "Connexion"}
          </button>
          <button className="button secondary wide-button" type="button" onClick={() => setMode(isRegister ? "login" : "register")}>
            {isRegister ? "J'ai deja un compte" : "Inscription"}
          </button>
        </form>
      </section>
    </main>
  );
}
