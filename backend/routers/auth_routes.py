"""Inscription, connexion, profil courant."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from auth import create_access_token, current_user, hash_password, verify_password
from db import get_session
from models import User
from schemas import AuthOut, ErrorOut, LoginIn, RegisterIn, UserOut

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

    user = User(
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        phone=phone,
        email=payload.email,
        password_hash=hash_password(payload.password),
    )
    session.add(user)
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
