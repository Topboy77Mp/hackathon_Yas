"""Endpoints IA : assistant de paliers et messages de partage.

Aucun des deux ne se trouve sur le chemin critique de la démonstration (D7).
Les deux fonctionnent sans clé API, en repli déterministe.
"""

from __future__ import annotations

import re
import time
from collections import defaultdict, deque

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlmodel import Session, select

import ai
import pricing
from auth import current_user, require_merchant
from config import AI_RATE_LIMIT, AI_RATE_WINDOW_SECONDS, APP_PUBLIC_URL
from db import get_session
from models import Group, GroupStatus, Merchant, Product, User
from schemas import (
    DiscoverIn,
    DiscoverOut,
    ErrorOut,
    GroupSuggestion,
    ShareMessageIn,
    ShareMessageOut,
    ShareVariant,
    SuggestTiersIn,
    SuggestTiersOut,
    TierSuggestion,
)
from services import (
    build_group_card,
    group_quantity,
    product_tiers,
    settle_expired_groups,
)

router = APIRouter(tags=["ia"])

RATE_LIMITED = {429: {"model": ErrorOut, "description": "Trop de requêtes"}}

_hits: dict[int, deque[float]] = defaultdict(deque)


def rate_limit(user: User = Depends(current_user)) -> User:
    """Fenêtre glissante en mémoire. Suffisant pour un hackathon mono-processus."""
    now = time.monotonic()
    window = _hits[user.id]
    while window and now - window[0] > AI_RATE_WINDOW_SECONDS:
        window.popleft()
    if len(window) >= AI_RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail={
                "detail": "Trop de requêtes. Réessayez dans une minute.",
                "code": "RATE_LIMITED",
            },
        )
    window.append(now)
    return user


@router.post(
    "/ai/suggest-tiers",
    response_model=SuggestTiersOut,
    responses=RATE_LIMITED,
    summary="Propose une grille de paliers cohérente (IA-1)",
)
def suggest_tiers(
    payload: SuggestTiersIn,
    _: User = Depends(rate_limit),
    __: Merchant = Depends(require_merchant),
) -> SuggestTiersOut:
    """L'IA propose, le commerçant décide, le serveur valide.

    La sortie est systématiquement repassée par `pricing.validate_tiers`. En cas
    d'échec du modèle ou de grille incohérente, on renvoie la grille déterministe
    sans jamais signaler l'incident à l'utilisateur.
    """
    tiers, source = ai.suggest_tiers(
        payload.product_name, payload.retail_price, payload.stock, payload.floor_price
    )
    return SuggestTiersOut(
        tiers=[
            TierSuggestion(
                min_quantity=t.min_quantity,
                max_quantity=t.max_quantity,
                unit_price=t.unit_price,
                justification=t.justification,
            )
            for t in tiers
        ],
        source=source,
    )


CANDIDATS_MAX = 20
MOTS_MAX = 8


@router.post(
    "/ai/discover-groups",
    response_model=DiscoverOut,
    responses=RATE_LIMITED,
    summary="Propose des groupes existants plutôt qu'un doublon (IA-3)",
)
def discover_groups(
    payload: DiscoverIn,
    _: User = Depends(rate_limit),
    session: Session = Depends(get_session),
) -> DiscoverOut:
    """Intercepte la création d'un groupe quand un groupe équivalent existe déjà.

    La fragmentation de la demande est le seul risque existentiel du modèle :
    trois groupes de 60 sacs ne débloquent aucun palier, un groupe de 180 en
    débloque deux. L'interception compte davantage que la finesse du matching.

    Présélection SQL grossière, puis un unique appel au modèle. En cas d'échec,
    les résultats SQL sont renvoyés tels quels, sans jamais signaler l'incident.
    """
    settle_expired_groups(session)

    # Présélection grossière, mot à mot. Chercher la requête entière comme une
    # seule sous-chaîne ne remonte jamais rien sur une phrase naturelle :
    # « engrais pour mon maïs » n'est pas contenu dans « Engrais NPK 15-15-15 ».
    mots = [m for m in re.split(r"[^\w]+", payload.query.lower()) if len(m) >= 3]
    motifs = [f"%{m}%" for m in mots[:MOTS_MAX]] or [f"%{payload.query.strip()}%"]

    requete = (
        select(Group, Product)
        .join(Product, Product.id == Group.product_id)
        .where(
            Group.status == GroupStatus.OPEN,
            or_(
                *[Product.name.ilike(motif) for motif in motifs],
                *[Group.name.ilike(motif) for motif in motifs],
            ),
        )
    )
    if payload.product_id is not None:
        requete = requete.where(Group.product_id == payload.product_id)

    lignes = session.exec(requete.limit(CANDIDATS_MAX)).all()

    candidats = [
        {
            "id": groupe.id,
            "group_name": groupe.name,
            "product_name": produit.name,
            "unit_label": produit.unit_label,
            "current_quantity": group_quantity(groupe.id, session),
            "target_quantity": groupe.target_quantity,
        }
        for groupe, produit in lignes
    ]

    correspondances, source = ai.discover_groups(payload.query, candidats)
    par_identifiant = {groupe.id: groupe for groupe, _ in lignes}

    return DiscoverOut(
        query=payload.query,
        suggestions=[
            GroupSuggestion(
                score=m.score,
                reason=m.reason,
                group=build_group_card(par_identifiant[m.group_id], session),
            )
            for m in correspondances
            if m.group_id in par_identifiant
        ],
        source=source,
    )


@router.post(
    "/ai/share-message",
    response_model=ShareMessageOut,
    responses={**RATE_LIMITED, 404: {"model": ErrorOut, "description": "Groupe introuvable"}},
    summary="Génère trois messages de partage en français (IA-2)",
)
def share_message(
    payload: ShareMessageIn,
    _: User = Depends(rate_limit),
    session: Session = Depends(get_session),
) -> ShareMessageOut:
    group = session.get(Group, payload.group_id)
    if group is None:
        raise HTTPException(
            status_code=404,
            detail={"detail": "Groupe introuvable.", "code": "GROUP_NOT_FOUND"},
        )

    product = session.get(Product, group.product_id)
    quantity = group_quantity(group.id, session)
    snapshot = pricing.compute(
        product_tiers(product.id, session),
        quantity,
        product.individual_price,
        group.target_quantity,
    )

    share_url = f"{APP_PUBLIC_URL}/g/{group.share_code}"
    variants, source = ai.share_messages(
        product_name=product.name,
        current_price=snapshot.current_unit_price,
        next_price=snapshot.next_tier.unit_price if snapshot.next_tier else None,
        quantity_missing=snapshot.quantity_to_next_tier,
        unit_label=product.unit_label,
        share_url=share_url,
    )

    return ShareMessageOut(
        share_url=share_url,
        variants=[ShareVariant(**v) for v in variants],
        source=source,
    )
