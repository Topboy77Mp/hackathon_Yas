import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ApiError } from "../lib/api/client";
import { login } from "../lib/api/endpoints";
import { openSession } from "../lib/session";
import { useSession } from "../lib/useSession";

export function MerchantLoginPage() {
  const session = useSession();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (session) return <Navigate replace to="/offres" />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setIsSubmitting(true);
    setError(null);

    try {
      const auth = await login(String(form.get("phone")).trim(), String(form.get("password")));

      // Le backend authentifie tout le monde sur le même endpoint. Le dashboard
      // est réservé aux commerçants : refuser ici évite d'ouvrir un espace vide
      // à un acheteur, qui se heurterait ensuite à un 403 sur chaque page.
      if (auth.user.role !== "MERCHANT" && auth.user.role !== "ADMIN") {
        setError("Ce compte n’a pas d’accès commerçant.");
        return;
      }

      openSession({ token: auth.token, user: auth.user });
      navigate("/offres", { replace: true });
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) {
        setError("Numéro ou mot de passe incorrect.");
      } else {
        setError(reason instanceof Error ? reason.message : "Connexion impossible.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-page" aria-labelledby="login-title">
      <form className="auth-card" onSubmit={submit}>
        <div className="eyebrow">Espace commerçant</div>
        <h1 id="login-title">Développez vos ventes groupées.</h1>
        <p className="page-intro">
          Connectez-vous pour créer vos offres et suivre les groupes en cours.
        </p>

        <label className="field">
          <span>Numéro de téléphone</span>
          <input
            autoComplete="tel"
            defaultValue="+22890000001"
            inputMode="tel"
            name="phone"
            placeholder="+228 90 00 00 01"
            required
            type="tel"
          />
        </label>

        <label className="field">
          <span>Mot de passe</span>
          <input
            autoComplete="current-password"
            name="password"
            placeholder="Votre mot de passe"
            required
            type="password"
          />
        </label>

        {error && <p className="form-error" role="alert">{error}</p>}

        <button className="button button-primary" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Connexion…" : "Se connecter"}
        </button>

        <p className="form-note">
          Compte de démonstration : <strong>+22890000001</strong> · <strong>demo1234</strong>
        </p>
      </form>
    </section>
  );
}
