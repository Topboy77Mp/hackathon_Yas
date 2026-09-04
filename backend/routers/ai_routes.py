"""Endpoints IA : assistant de paliers et messages de partage.

Aucun des deux ne se trouve sur le chemin critique de la démonstration (D7).
Les deux fonctionnent sans clé API, en repli déterministe.
"""

from __future__ import annotations

import time
from collections import defaultdict, deque

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

import ai
import pricing
from auth import current_user, require_merchant
from config import AI_RATE_LIMIT, AI_RATE_WINDOW_SECONDS, APP_PUBLIC_URL
from db import get_session
from models import Group, Merchant, Product, User
from schemas import (
    ErrorOut,
    ShareMessageIn,
    ShareMessageOut,
    ShareVariant,
    SuggestTiersIn,
    SuggestTiersOut,
    TierSuggestion,
)
from services import group_quantity, product_tiers

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
