# Tester par câble USB

Plus fiable qu'un Wi-Fi partagé : aucune dépendance au réseau, aucun risque
d'isolation des clients, et le débit est meilleur. C'est la méthode à privilégier
le jour de la démonstration.

## Le principe

`adb reverse` ouvre un tunnel du téléphone vers le PC. Une fois posé,
**`localhost` sur le téléphone désigne le PC**, pas le téléphone. C'est ce qui
rend la méthode robuste : plus aucune adresse IP à connaître ni à mettre à jour
quand le réseau change.

## Préparer le téléphone — une seule fois

1. **Paramètres → À propos du téléphone**
2. Toucher **sept fois** « Numéro de build ». Le message « Vous êtes développeur »
   s'affiche.
3. **Paramètres → Système → Options pour les développeurs**
4. Activer **Débogage USB**.
5. Brancher le câble. Une fenêtre « Autoriser le débogage USB ? » apparaît sur le
   téléphone : accepter, et cocher « Toujours autoriser ».

Utiliser un câble de **données**, pas un câble de charge seule : c'est la cause
la plus fréquente d'un appareil qui n'apparaît jamais.

## Vérifier la connexion

    adb devices

Attendu :

    List of devices attached
    ABC123XYZ    device

- `unauthorized` → l'autorisation n'a pas été acceptée sur le téléphone.
- Liste vide → câble de charge seule, ou débogage USB non activé.

## Lancer

**Terminal 1 — l'API :**

    cd ~/Downloads/hackJOCKO/backend
    ./.venv/bin/uvicorn main:app --port 8000

Le `--host 0.0.0.0` n'est plus nécessaire : le tunnel arrive sur `127.0.0.1`.

**Terminal 2 — les tunnels, puis l'application :**

    adb reverse tcp:8081 tcp:8081    # Metro
    adb reverse tcp:8000 tcp:8000    # API

    cd ~/Downloads/hackJOCKO/app
    npx expo start --localhost

Puis, dans le terminal d'Expo, appuyer sur **`a`** : l'application s'ouvre
directement dans Expo Go, sans scanner de QR code.

Vérifier les tunnels à tout moment :

    adb reverse --list

## Après un débranchement

Les redirections disparaissent quand le câble est retiré ou le téléphone
redémarré. Les reposer :

    adb reverse tcp:8081 tcp:8081 && adb reverse tcp:8000 tcp:8000

## Si l'application affiche « connexion impossible »

Elle indique elle-même la cause probable. Dans l'ordre :

1. `adb reverse --list` montre-t-il les deux lignes ?
2. L'API répond-elle sur le PC ? `curl localhost:8000/health`
3. Le téléphone est-il toujours listé ? `adb devices`

## Installer un APK par le même câble

Quand l'APK existera :

    adb install -r chemin/vers/app-release.apk

Le tunnel `adb reverse tcp:8000 tcp:8000` reste nécessaire pour que l'APK
atteigne l'API — mais **plus celui de Metro** : un APK embarque son propre code
JavaScript.
