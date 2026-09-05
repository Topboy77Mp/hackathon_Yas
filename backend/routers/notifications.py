"""Notifications in-app.

Le contrat exclut le push mais retient « une liste de notifications en base
+ badge in-app ». Les lignes étaient écrites au franchissement de palier et à
l'annulation d'un groupe, sans aucun moyen de les lire : ces deux routes
ferment la boucle.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, func, select

from auth import current_user
from db import get_session
from models import Notification, User, UserPreference
from schemas import ErrorOut, NotificationOut, NotificationsOut

router = APIRouter(tags=["notifications"])


@router.get(
    "/notifications",
    response_model=NotificationsOut,
    summary="Notifications de l'utilisateur courant, plus récentes d'abord",
)
def list_notifications(
    limit: int = 30,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
) -> NotificationsOut:
    rows = session.exec(
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .limit(max(1, min(limit, 100)))
    ).all()

    unread = int(
        session.exec(
            select(func.count())
            .select_from(Notification)
            .where(Notification.user_id == user.id, Notification.read == False)  # noqa: E712
        ).one()
    )

    # Préférence utilisateur : le serveur continue d'écrire les notifications,
    # c'est le compteur qui se tait. L'historique reste consultable — couper le
    # badge ne doit pas effacer ce qui s'est passé.
    pref = session.exec(
        select(UserPreference).where(UserPreference.user_id == user.id)
    ).first()
    if pref is not None and not pref.notifications_enabled:
        unread = 0

    return NotificationsOut(
        unread_count=unread,
        notifications=[
            NotificationOut.model_validate(n, from_attributes=True) for n in rows
        ],
    )


@router.post(
    "/notifications/{notification_id}/read",
    response_model=NotificationOut,
    responses={404: {"model": ErrorOut, "description": "Notification introuvable"}},
    summary="Marquer une notification comme lue",
)
def mark_read(
    notification_id: int,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
) -> NotificationOut:
    notification = session.get(Notification, notification_id)
    # On ne révèle pas l'existence de la notification d'un autre utilisateur.
    if notification is None or notification.user_id != user.id:
        raise HTTPException(
            status_code=404,
            detail={"detail": "Notification introuvable.", "code": "NOTIFICATION_NOT_FOUND"},
        )

    notification.read = True
    session.add(notification)
    session.commit()
    session.refresh(notification)
    return NotificationOut.model_validate(notification, from_attributes=True)
