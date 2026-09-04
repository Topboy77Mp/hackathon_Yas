"""API KashFlow — assemblage de l'application.

Le prix est calculé exclusivement côté serveur (D3). Toute la logique de palier
vit dans `pricing.py`, son application à la base dans `services.py`.
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routers import (
    ai_routes,
    auth_routes,
    demo,
    groups,
    merchant,
    orders,
    products,
    stats,
)

app = FastAPI(
    title="KashFlow API",
    version="0.2.0",
    description=(
        "Achat groupé à prix dégressif. Les paliers portent sur la quantité "
        "commandée, jamais sur le nombre de participants (D1), et le prix est "
        "rétroactif : quand un palier tombe, tout le groupe en profite (D2)."
    ),
)

# L'app Expo (mobile et web) et le dashboard Vite appellent depuis d'autres origines.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(_, exc: HTTPException) -> JSONResponse:
    """Réponses d'erreur uniformes {detail, code} : le front ne devine pas."""
    if isinstance(exc.detail, dict):
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": str(exc.detail), "code": f"HTTP_{exc.status_code}"},
    )


@app.get("/health", tags=["système"])
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth_routes.router)
app.include_router(products.router)
app.include_router(groups.router)
app.include_router(orders.router)
app.include_router(merchant.router)
app.include_router(stats.router)
app.include_router(ai_routes.router)
app.include_router(demo.router)
