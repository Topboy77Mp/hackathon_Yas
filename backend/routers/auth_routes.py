"""Inscription, connexion, profil courant."""

from __future__ import annotations

import secrets
from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlmodel import Session, select

from auth import create_access_token, current_user, hash_password, verify_password
from config import DEMO_TOKEN
from db import get_session
from models import Merchant, PasswordResetCode, User, UserPreference, UserRole, utcnow
from schemas import (
    AuthOut,
    ChangePasswordIn,
    ErrorOut,
    ForgotPasswordIn,
    ForgotPasswordOut,
    LoginIn,
    PreferencesIn,
    PreferencesOut,
    RegisterIn,
    ResetPasswordIn,
    UserOut,
)
from services import aware

router = APIRouter(tags=["authentification"])


def _auth_out(user: User) -> AuthOut:
    return AuthOut(token=create_access_token(user.id), user=UserOut.model_validate(user, from_attributes=True))


@router.post(
    "/auth/register",
    response_model=AuthOut,
    responses={409: {"model": ErrorOut, "description": "Téléphone déjà utilisé"}},
)
def register(payload: RegisterIn, session: Session = Depends(get_session)) -> AuthOut:
    phone = payload.phone.strip()
    exists = session.exec(select(User).where(User.phone == phone)).first()
    if exists is not None:
        raise HTTPException(
            status_code=409,
            detail={"detail": "Ce numéro est déjà inscrit.", "code": "PHONE_TAKEN"},
        )

    # Un nom de boutique fait du compte un commerçant. Le rôle est décidé ici,
    # jamais envoyé par le client : accepter un `role` dans le payload
    # laisserait n'importe qui s'inscrire administrateur.
    est_commercant = bool(payload.business_name and payload.business_name.strip())

    user = User(
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        phone=phone,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=UserRole.MERCHANT if est_commercant else UserRole.USER,
    )
    session.add(user)
    session.flush()

    if est_commercant:
        session.add(
            Merchant(
                user_id=user.id,
                business_name=payload.business_name.strip(),
                location=(payload.business_location or "").strip() or None,
                description=(payload.business_description or "").strip() or None,
            )
        )

    session.commit()
    session.refresh(user)
    return _auth_out(user)


@router.post(
    "/auth/login",
    response_model=AuthOut,
    responses={401: {"model": ErrorOut, "description": "Identifiants invalides"}},
)
def login(payload: LoginIn, session: Session = Depends(get_session)) -> AuthOut:
    user = session.exec(select(User).where(User.phone == payload.phone.strip())).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        # Message volontairement identique dans les deux cas : on n'indique pas
        # si le numéro existe.
        raise HTTPException(
            status_code=401,
            detail={"detail": "Numéro ou mot de passe incorrect.", "code": "BAD_CREDENTIALS"},
        )
    return _auth_out(user)


@router.get("/auth/me", response_model=UserOut)
def me(user: User = Depends(current_user)) -> UserOut:
    return UserOut.model_validate(user, from_attributes=True)


# ── Réinitialisation de mot de passe ────────────────────────────────────────
#
# Aucune passerelle SMS n'est au périmètre (`<exclus>` : aucun service externe).
# Le flux est donc complet et réel côté serveur — code à usage unique, haché,
# daté, invalidé après emploi — mais sa **remise** passe par le canal de
# démonstration. Simuler un envoi de SMS aurait été un mensonge à l'écran.

CODE_VALIDITE_MINUTES = 15
CODE_LONGUEUR = 6


def _code_aleatoire() -> str:
    """Six chiffres : saisissable au clavier téléphonique, non devinable."""
    return f"{secrets.randbelow(10 ** CODE_LONGUEUR):0{CODE_LONGUEUR}d}"


@router.post(
    "/auth/forgot-password",
    response_model=ForgotPasswordOut,
    summary="Demande un code de réinitialisation",
)
def forgot_password(
    payload: ForgotPasswordIn,
    x_demo_token: Annotated[str | None, Header()] = None,
    session: Session = Depends(get_session),
) -> ForgotPasswordOut:
    """Répond toujours la même chose, que le numéro existe ou non.

    Distinguer les deux cas ferait de cet endpoint un annuaire : on saurait quels
    numéros sont inscrits en les essayant un par un.
    """
    user = session.exec(select(User).where(User.phone == payload.phone.strip())).first()

    code = _code_aleatoire()
    if user is not None:
        # Les codes encore valides du même compte sont invalidés : une seule
        # demande à la fois, sinon plusieurs codes ouvrent la même porte.
        for ancien in session.exec(
            select(PasswordResetCode).where(
                PasswordResetCode.user_id == user.id,
                PasswordResetCode.used_at.is_(None),
            )
        ).all():
            ancien.used_at = utcnow()
            session.add(ancien)

        session.add(
            PasswordResetCode(
                user_id=user.id,
                code_hash=hash_password(code),
                expires_at=utcnow() + timedelta(minutes=CODE_VALIDITE_MINUTES),
            )
        )
        session.commit()

    demo = (
        code
        if user is not None
        and x_demo_token
        and secrets.compare_digest(x_demo_token, DEMO_TOKEN)
        else None
    )
    return ForgotPasswordOut(sent=True, demo_code=demo)


@router.post(
    "/auth/reset-password",
    response_model=AuthOut,
    responses={400: {"model": ErrorOut, "description": "Code invalide ou expiré"}},
    summary="Réinitialise le mot de passe avec le code reçu",
)
def reset_password(
    payload: ResetPasswordIn, session: Session = Depends(get_session)
) -> AuthOut:
    invalide = HTTPException(
        status_code=400,
        detail={"detail": "Code invalide ou expiré.", "code": "INVALID_RESET_CODE"},
    )

    user = session.exec(select(User).where(User.phone == payload.phone.strip())).first()
    if user is None:
        raise invalide

    codes = session.exec(
        select(PasswordResetCode)
        .where(
            PasswordResetCode.user_id == user.id,
            PasswordResetCode.used_at.is_(None),
        )
        .order_by(PasswordResetCode.id.desc())
    ).all()

    correspondant = next(
        (
            c
            for c in codes
            if aware(c.expires_at) > utcnow()
            and verify_password(payload.code.strip(), c.code_hash)
        ),
        None,
    )
    if correspondant is None:
        raise invalide

    correspondant.used_at = utcnow()
    user.password_hash = hash_password(payload.new_password)
    session.add_all([correspondant, user])
    session.commit()
    session.refresh(user)

    # Connexion immédiate : redemander le mot de passe qu'on vient de choisir
    # est une friction gratuite.
    return _auth_out(user)


@router.post(
    "/auth/change-password",
    response_model=UserOut,
    responses={400: {"model": ErrorOut, "description": "Mot de passe actuel incorrect"}},
    summary="Change son mot de passe depuis le compte",
)
def change_password(
    payload: ChangePasswordIn,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
) -> UserOut:
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(
            status_code=400,
            detail={"detail": "Mot de passe actuel incorrect.", "code": "BAD_PASSWORD"},
        )
    if payload.new_password == payload.current_password:
        raise HTTPException(
            status_code=400,
            detail={
                "detail": "Le nouveau mot de passe doit être différent.",
                "code": "SAME_PASSWORD",
            },
        )

    user.password_hash = hash_password(payload.new_password)
    session.add(user)
    session.commit()
    session.refresh(user)
    return UserOut.model_validate(user, from_attributes=True)


# ── Préférences ─────────────────────────────────────────────────────────────

def _preferences(user: User, session: Session) -> UserPreference:
    """Crée la ligne à la première lecture : pas de migration à prévoir."""
    pref = session.exec(
        select(UserPreference).where(UserPreference.user_id == user.id)
    ).first()
    if pref is None:
        pref = UserPreference(user_id=user.id)
        session.add(pref)
        session.commit()
        session.refresh(pref)
    return pref


@router.get("/me/preferences", response_model=PreferencesOut, summary="Lit ses préférences")
def read_preferences(
    user: User = Depends(current_user), session: Session = Depends(get_session)
) -> PreferencesOut:
    pref = _preferences(user, session)
    return PreferencesOut(
        notifications_enabled=pref.notifications_enabled,
        default_share_register=pref.default_share_register,
    )


@router.patch("/me/preferences", response_model=PreferencesOut, summary="Modifie ses préférences")
def update_preferences(
    payload: PreferencesIn,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
) -> PreferencesOut:
    pref = _preferences(user, session)

    if payload.notifications_enabled is not None:
        pref.notifications_enabled = payload.notifications_enabled
    if payload.default_share_register is not None:
        pref.default_share_register = payload.default_share_register.strip() or "famille"

    pref.updated_at = utcnow()
    session.add(pref)
    session.commit()
    session.refresh(pref)

    return PreferencesOut(
        notifications_enabled=pref.notifications_enabled,
        default_share_register=pref.default_share_register,
    )
