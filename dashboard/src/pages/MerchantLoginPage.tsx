import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginMerchant } from "../lib/authData";

export function MerchantLoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setIsSubmitting(true);
    setError(null);
    try {
      await loginMerchant(String(form.get("phone")), String(form.get("password")));
      navigate("/offres");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Connexion impossible.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-page" aria-labelledby="login-title">
      <form className="auth-card" onSubmit={submit}>
        <div className="eyebrow">Espace commerçant</div>
        <h1 id="login-title">Développez vos ventes groupées.</h1>
        <p className="page-intro">Connectez-vous pour créer vos offres et suivre les groupes actifs.</p>
        <label className="field">
          <span>Numéro de téléphone</span>
          <input autoComplete="tel" inputMode="tel" name="phone" placeholder="90 00 00 00" required type="tel" />
        </label>
        <label className="field">
          <span>Mot de passe</span>
          <input autoComplete="current-password" name="password" placeholder="Votre mot de passe" required type="password" />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-primary" disabled={isSubmitting} type="submit">{isSubmitting ? "Connexion…" : "Se connecter"}</button>
        <p className="form-note">Mode démo : toute combinaison permet d’ouvrir l’espace commerçant.</p>
      </form>
    </section>
  );
}
