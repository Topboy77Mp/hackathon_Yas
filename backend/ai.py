"""Fonctionnalités IA : assistant de paliers (IA-1) et messages de partage (IA-2).

Trois règles non négociables, tirées de la `<regle_commune>` du contrat :

1. Aucune exception LLM ne remonte à l'utilisateur. Un échec bascule en repli.
2. Timeout strict. Au-delà, on n'attend pas : on replie.
3. Sans clé API, l'application fonctionne INTÉGRALEMENT en mode repli. C'est une
   exigence, pas un confort — la démo doit tenir hors ligne.

Et la règle D7 : aucun de ces appels ne se trouve sur le chemin critique de la
démonstration. Le prix, lui, ne vient jamais d'un modèle.
"""

from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass

import httpx

import pricing
from config import GROQ_API_KEY, GROQ_BASE_URL, GROQ_MODEL, GROQ_TIMEOUT_SECONDS

logger = logging.getLogger("kashflow.ai")


@dataclass(frozen=True)
class TierProposal:
    min_quantity: int
    max_quantity: int | None
    unit_price: int
    justification: str


def _call_groq(prompt: str, max_tokens: int = 700) -> dict | None:
    """Un appel, une réponse JSON, ou None. Ne lève jamais."""
    if not GROQ_API_KEY:
        logger.info("ia: aucune clé configurée, repli déterministe")
        return None

    started = time.perf_counter()
    try:
        response = httpx.post(
            f"{GROQ_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": GROQ_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2,
                "max_tokens": max_tokens,
                "response_format": {"type": "json_object"},
            },
            timeout=GROQ_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        logger.info(
            "ia: succès en %.2fs (modèle %s)",
            time.perf_counter() - started,
            GROQ_MODEL,
        )
        return parsed
    except Exception as exc:  # noqa: BLE001 — aucun échec IA ne doit remonter
        logger.warning(
            "ia: échec après %.2fs, repli déterministe (%s: %s)",
            time.perf_counter() - started,
            type(exc).__name__,
            exc,
        )
        return None


# ── IA-1 : assistant de paliers ────────────────────────────────────────────

def fallback_tiers(retail_price: int, stock: int) -> list[TierProposal]:
    """Grille déterministe : seuils à 10 %, 25 % et 50 % du stock,
    remises de 6 %, 12 % et 20 %. Jamais en panne, et indiscernable d'un
    résultat de modèle pour un observateur."""
    steps = [
        (max(int(stock * 0.10), 2), 0.06),
        (max(int(stock * 0.25), 3), 0.12),
        (max(int(stock * 0.50), 4), 0.20),
    ]

    proposals = [
        TierProposal(1, None, retail_price, "Prix au détail, pour les petites quantités.")
    ]
    seen = {1}
    for threshold, discount in steps:
        if threshold in seen:
            threshold = max(seen) + 1
        seen.add(threshold)
        price = int(round(retail_price * (1 - discount) / 50) * 50)
        proposals.append(
            TierProposal(
                threshold,
                None,
                price,
                f"À partir de {threshold} unités, {int(discount * 100)} % de remise.",
            )
        )

    # Seul le dernier palier reste ouvert : les autres se ferment au seuil suivant.
    closed: list[TierProposal] = []
    for current, following in zip(proposals, proposals[1:]):
        closed.append(
            TierProposal(
                current.min_quantity,
                following.min_quantity - 1,
                current.unit_price,
                current.justification,
            )
        )
    closed.append(proposals[-1])
    return closed


def _coerce_tiers(raw: dict, retail_price: int) -> list[TierProposal] | None:
    try:
        items = raw["tiers"]
        parsed = [
            TierProposal(
                int(item["min_quantity"]),
                None if item.get("max_quantity") in (None, "", 0) else int(item["max_quantity"]),
                int(item["unit_price"]),
                str(item.get("justification", ""))[:160],
            )
            for item in items
        ]
    except (KeyError, TypeError, ValueError):
        return None

    if not parsed:
        return None

    parsed.sort(key=lambda t: t.min_quantity)

    # Les modèles bradent spontanément le premier palier sous le prix de détail,
    # quelle que soit la consigne. On le remet d'office : c'est le prix de détail
    # par définition, et cet invariant n'est pas couvert par validate_tiers.
    if parsed[0].min_quantity != 1 or parsed[0].unit_price != retail_price:
        parsed = [
            TierProposal(1, None, retail_price, "Prix au détail, pour les petites quantités.")
        ] + [t for t in parsed if t.min_quantity > 1]

    rebuilt: list[TierProposal] = []
    for current, following in zip(parsed, parsed[1:]):
        rebuilt.append(
            TierProposal(
                current.min_quantity,
                following.min_quantity - 1,
                current.unit_price,
                current.justification,
            )
        )
    rebuilt.append(
        TierProposal(
            parsed[-1].min_quantity, None, parsed[-1].unit_price, parsed[-1].justification
        )
    )
    return rebuilt


def suggest_tiers(
    product_name: str, retail_price: int, stock: int, floor_price: int | None = None
) -> tuple[list[TierProposal], str]:
    """Renvoie (paliers, origine) où origine vaut "ia" ou "repli".

    La sortie du modèle est TOUJOURS repassée par la validation déterministe.
    Si elle échoue, on replie sans jamais le signaler à l'utilisateur.
    """
    plancher = (
        f" Le prix ne doit jamais descendre sous {floor_price} FCFA."
        if floor_price
        else ""
    )
    prompt = (
        f"Tu aides un commerçant togolais à construire une grille de prix dégressive.\n"
        f"Produit : {product_name}. Prix de détail : {retail_price} FCFA. "
        f"Stock disponible : {stock} unités.{plancher}\n"
        f"Règles impératives :\n"
        f"- Exactement 4 paliers.\n"
        f"- Le PREMIER palier commence à 1 et vaut EXACTEMENT {retail_price} "
        f"(c'est le prix de détail, il ne doit pas être remisé).\n"
        f"- Les 3 suivants ont des seuils croissants et des prix strictement décroissants.\n"
        f"- Remises réalistes entre 5 et 25 %. Aucun seuil ne dépasse {stock}.\n"
        f"- Montants entiers en FCFA, arrondis à la centaine.\n"
        f"Réponds uniquement en JSON : "
        f'{{"tiers":[{{"min_quantity":int,"unit_price":int,'
        f'"justification":"une phrase courte en français simple"}}]}}'
    )

    raw = _call_groq(prompt)
    if raw is not None:
        candidate = _coerce_tiers(raw, retail_price)
        if candidate is not None:
            errors = pricing.validate_tiers(candidate, stock=stock)
            if not errors:
                return candidate, "ia"
            logger.warning("ia-1: sortie invalide, repli — %s", errors[:2])

    return fallback_tiers(retail_price, stock), "repli"


# ── IA-2 : messages de partage ─────────────────────────────────────────────

REGISTRES = {
    "famille": "un ton chaleureux et familier, tutoiement",
    "cooperative": "un ton professionnel et sobre, vouvoiement, registre coopérative agricole",
    "association": "un ton collectif et mobilisateur, adressé aux membres d'un groupement",
}


def fallback_messages(
    product_name: str,
    current_price: int,
    next_price: int | None,
    quantity_missing: int | None,
    share_url: str,
) -> list[dict]:
    """Trois gabarits interpolés. Le bouton de partage fonctionne toujours,
    même sans réseau et même sans clé."""
    if next_price and quantity_missing:
        accroche = (
            f"À {quantity_missing} unités de plus, le prix passe de "
            f"{current_price} à {next_price} FCFA."
        )
    else:
        accroche = f"Le prix est déjà descendu à {current_price} FCFA."

    return [
        {
            "registre": "famille",
            "texte": f"Bonjour, nous achetons du {product_name} à plusieurs. "
                     f"{accroche} Rejoins-nous : {share_url}",
        },
        {
            "registre": "cooperative",
            "texte": f"Bonjour, la coopérative regroupe une commande de {product_name}. "
                     f"{accroche} Pour participer : {share_url}",
        },
        {
            "registre": "association",
            "texte": f"Chers membres, notre groupement commande du {product_name}. "
                     f"{accroche} Rejoignez la commande : {share_url}",
        },
    ]


def _coerce_messages(raw: dict, share_url: str) -> list[dict] | None:
    try:
        items = raw["messages"]
        cleaned = []
        for item in items:
            registre = str(item.get("registre", "")).strip().lower()
            texte = str(item["texte"]).strip()
            if registre not in REGISTRES or not texte:
                continue
            # Un message sans le lien ne sert à rien : on le rattache.
            if share_url not in texte:
                texte = f"{texte} {share_url}"
            if len(texte) > 260:
                continue
            cleaned.append({"registre": registre, "texte": texte})
    except (KeyError, TypeError, ValueError):
        return None

    return cleaned if len(cleaned) >= 2 else None


def share_messages(
    product_name: str,
    current_price: int,
    next_price: int | None,
    quantity_missing: int | None,
    unit_label: str,
    share_url: str,
) -> tuple[list[dict], str]:
    """Trois variantes courtes en français, une par registre.

    L'éwé et le mina ont été retirés du périmètre obligatoire (voir
    docs/handoff/contract-changes.md, entrée de 11:44).
    """
    objectif = (
        f"Il manque {quantity_missing} {unit_label}s pour faire tomber le prix "
        f"de {current_price} à {next_price} FCFA."
        if next_price and quantity_missing
        else f"Le meilleur palier est déjà atteint, à {current_price} FCFA."
    )
    registres = "\n".join(f"- {clef} : {desc}" for clef, desc in REGISTRES.items())
    prompt = (
        f"Rédige 3 messages WhatsApp courts invitant à rejoindre un achat groupé "
        f"au Togo.\n"
        f"Produit : {product_name}. {objectif}\n"
        f"Lien à inclure tel quel : {share_url}\n"
        f"Un message par registre :\n{registres}\n"
        f"Contraintes : français uniquement, moins de 220 caractères par message, "
        f"chiffres exacts, pas d'emoji en rafale, le lien apparaît à la fin.\n"
        f'Réponds uniquement en JSON : {{"messages":[{{"registre":"famille|cooperative|association",'
        f'"texte":"..."}}]}}'
    )

    raw = _call_groq(prompt, max_tokens=500)
    if raw is not None:
        candidate = _coerce_messages(raw, share_url)
        if candidate is not None:
            return candidate, "ia"
        logger.warning("ia-2: sortie inexploitable, repli")

    return (
        fallback_messages(
            product_name, current_price, next_price, quantity_missing, share_url
        ),
        "repli",
    )
