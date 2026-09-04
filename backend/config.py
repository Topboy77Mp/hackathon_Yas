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

# Groq (OpenAI-compatible). Absente = mode fallback déterministe intégral,
# exigence de la <regle_commune> du contrat, pas un confort.
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
GROQ_BASE_URL = "https://api.groq.com/openai/v1"
GROQ_TIMEOUT_SECONDS = 4.0

DEMO_TOKEN = os.getenv("DEMO_TOKEN", "jokkoo-demo")
