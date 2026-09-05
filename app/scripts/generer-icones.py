"""Génère les icônes de KashFlow à partir des tokens de design.

Le motif : trois marches descendantes surmontées d'une flèche vers le bas —
c'est littéralement le produit, le prix qui tombe palier après palier. Choisi
pour rester lisible à 48 px, là où un dessin détaillé devient une tache.

Aucune identité tierce n'est reproduite : la marque est construite avec les
couleurs de `shared/theme/tokens.ts`, et rien d'autre.
"""
import re, subprocess, pathlib

TOKENS = pathlib.Path("/home/backbox/Downloads/hackJOCKO/shared/theme/tokens.ts").read_text()
JAUNE = re.search(r"yellow: '(#[0-9A-Fa-f]{6})'", TOKENS).group(1)
ENCRE = re.search(r"ink: '(#[0-9A-Fa-f]{6})'", TOKENS).group(1)
print(f"tokens : jaune={JAUNE} encre={ENCRE}")

def motif(couleur: str, taille: int = 1024) -> str:
    """Trois marches descendantes + flèche. Coordonnées sur une grille de 100."""
    return f'''
  <g fill="{couleur}">
    <rect x="14" y="30" width="26" height="9" rx="4.5"/>
    <rect x="14" y="46" width="40" height="9" rx="4.5"/>
    <rect x="14" y="62" width="54" height="9" rx="4.5"/>
    <path d="M78 26 h9 v34 h11 L82.5 78 L67 60 h11 z"/>
  </g>'''

def svg(fond: str | None, couleur_motif: str, taille: int, rayon: float = 0) -> str:
    arriere = (
        f'<rect width="100" height="100" rx="{rayon}" fill="{fond}"/>' if fond else ""
    )
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="{taille}" height="{taille}">
  {arriere}{motif(couleur_motif, taille)}
</svg>'''

def ecrire(nom: str, contenu: str, taille: int):
    src = pathlib.Path(f"/tmp/{nom}.svg")
    src.write_text(contenu)
    dest = pathlib.Path(f"assets/{nom}.png")
    subprocess.run(
        ["magick", "-background", "none", "-density", "600",
         str(src), "-resize", f"{taille}x{taille}", str(dest)],
        check=True,
    )
    print(f"  {dest} ({taille}x{taille})")

# Icône d'application : marque encre sur fond jaune, coins arrondis gérés par Android.
ecrire("icon", svg(JAUNE, ENCRE, 1024), 1024)

# Splash : le fond est déjà encre (app.json), la marque doit donc être jaune.
ecrire("splash-icon", svg(None, JAUNE, 1024), 1024)

# Icône adaptative : le fond est une couche séparée, l'avant-plan doit tenir
# dans les deux tiers centraux — Android rogne le reste selon le masque du
# constructeur.
avant = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512">
  <g transform="translate(19 19) scale(0.62)">{motif(ENCRE)}</g>
</svg>'''
ecrire("android-icon-foreground", avant, 512)
ecrire("android-icon-background", svg(JAUNE, JAUNE, 512), 512)

mono = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="432" height="432">
  <g transform="translate(19 19) scale(0.62)">{motif("#FFFFFF")}</g>
</svg>'''
ecrire("android-icon-monochrome", mono, 432)

ecrire("favicon", svg(JAUNE, ENCRE, 48), 48)
