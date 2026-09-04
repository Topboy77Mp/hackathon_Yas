"""Moteur et session. Pas d'Alembic pour le hackathon : create_all + script de reset."""

from __future__ import annotations

from collections.abc import Iterator

from sqlmodel import Session, SQLModel, create_engine

import models  # noqa: F401  (import nécessaire pour peupler SQLModel.metadata)
from config import DATABASE_URL

engine = create_engine(DATABASE_URL, echo=False, pool_pre_ping=True)


def create_all() -> None:
    SQLModel.metadata.create_all(engine)


def drop_all() -> None:
    SQLModel.metadata.drop_all(engine)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
