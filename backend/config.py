"""Configuration lue depuis l'environnement. Aucun secret en dur (cf. exigences BACK)."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://kashflow:kashflow@localhost:5432/kashflow"
)
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-non-utilisable-en-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
DEMO_TOKEN = os.getenv("DEMO_TOKEN", "jokkoo-demo")
