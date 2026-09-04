"""Jetons JWT et résolution de l'utilisateur courant.

Phase 1A : uniquement ce dont GET /groups/{id} a besoin, à savoir une
authentification OPTIONNELLE (le groupe est consultable sans compte via un lien
partagé). Les endpoints /auth/* et les dépendances de rôle arrivent en Phase 2.
"""

from __future__ import annotations

from datetime import timedelta

from fastapi import Depends, Request
from jose import JWTError, jwt
from sqlmodel import Session

from config import JWT_ALGORITHM, JWT_EXPIRE_MINUTES, JWT_SECRET
from db import get_session
from models import User, utcnow


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


def current_user_optional(
    request: Request, session: Session = Depends(get_session)
) -> User | None:
    """Utilisateur courant si un jeton valide est présent, sinon None.

    Ne lève jamais : la vue publique d'un groupe doit rester consultable.
    """
    header = request.headers.get("Authorization", "")
    if not header.lower().startswith("bearer "):
        return None
    user_id = decode_user_id(header.split(" ", 1)[1].strip())
    if user_id is None:
        return None
    return session.get(User, user_id)
