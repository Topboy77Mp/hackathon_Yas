"""Sécurité : hachage des mots de passe, jetons JWT, dépendances de rôle.

`current_user_optional` reste volontairement permissif : la vue publique d'un
groupe arrivé par lien partagé doit rester consultable sans compte.
"""

from __future__ import annotations

from datetime import timedelta

from fastapi import Depends, HTTPException, Request
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlmodel import Session, select

from config import JWT_ALGORITHM, JWT_EXPIRE_MINUTES, JWT_SECRET
from db import get_session
from models import Group, Merchant, User, UserRole, utcnow

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_access_token(user_id: int) -> str:
    expire = utcnow() + timedelta(minutes=JWT_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": str(user_id), "exp": expire}, JWT_SECRET, algorithm=JWT_ALGORITHM
    )


def decode_user_id(token: str) -> int | None:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        return None
    sub = payload.get("sub")
    return int(sub) if sub and str(sub).isdigit() else None


def _bearer_token(request: Request) -> str | None:
    header = request.headers.get("Authorization", "")
    if not header.lower().startswith("bearer "):
        return None
    return header.split(" ", 1)[1].strip() or None


def current_user_optional(
    request: Request, session: Session = Depends(get_session)
) -> User | None:
    token = _bearer_token(request)
    if token is None:
        return None
    user_id = decode_user_id(token)
    if user_id is None:
        return None
    return session.get(User, user_id)


def current_user(
    request: Request, session: Session = Depends(get_session)
) -> User:
    token = _bearer_token(request)
    user = None
    if token is not None:
        user_id = decode_user_id(token)
        if user_id is not None:
            user = session.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=401,
            detail={"detail": "Authentification requise.", "code": "UNAUTHENTICATED"},
        )
    return user


def require_merchant(
    user: User = Depends(current_user), session: Session = Depends(get_session)
) -> Merchant:
    """Renvoie la boutique de l'utilisateur courant, ou 403."""
    if user.role not in (UserRole.MERCHANT, UserRole.ADMIN):
        raise HTTPException(
            status_code=403,
            detail={"detail": "Réservé aux commerçants.", "code": "NOT_A_MERCHANT"},
        )
    merchant = session.exec(
        select(Merchant).where(Merchant.user_id == user.id)
    ).first()
    if merchant is None:
        raise HTTPException(
            status_code=403,
            detail={"detail": "Aucune boutique associée à ce compte.", "code": "NO_MERCHANT_PROFILE"},
        )
    return merchant


def require_group_creator(
    group_id: int,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
) -> Group:
    """Être administrateur d'un groupe est une relation, pas un rôle (D5)."""
    group = session.get(Group, group_id)
    if group is None:
        raise HTTPException(
            status_code=404,
            detail={"detail": "Groupe introuvable.", "code": "GROUP_NOT_FOUND"},
        )
    if group.creator_id != user.id and user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=403,
            detail={"detail": "Réservé au créateur du groupe.", "code": "NOT_GROUP_CREATOR"},
        )
    return group
