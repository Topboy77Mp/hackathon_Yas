#!/usr/bin/env bash
# Remet en place tout ce qu'une déconnexion USB fait perdre.
#
# Les redirections `adb reverse` ne survivent ni au débranchement, ni au
# redémarrage du téléphone, ni à une mise en veille qui coupe l'ADB. C'est la
# cause la plus fréquente d'une application qui « ne trouve plus l'API ».
set -u

APK=${1:-/tmp/ExpoGo-57.apk}

echo "En attente du téléphone… (branche le câble, déverrouille l'écran)"
adb wait-for-device

echo "→ appareil détecté : $(adb devices | sed -n 2p | cut -f1)"

# Expo Go n'est réinstallé que si la version en place ne convient pas.
VERSION=$(adb shell dumpsys package host.exp.exponent 2>/dev/null | grep -m1 versionName | cut -d= -f2 | tr -d '\r')
if [[ "$VERSION" == 57.* ]]; then
  echo "→ Expo Go $VERSION déjà en place"
else
  echo "→ Expo Go $VERSION incompatible SDK 57, installation de la bonne version…"
  adb install -r "$APK" || { echo "échec de l'installation"; exit 1; }
fi

adb reverse tcp:8081 tcp:8081 >/dev/null
adb reverse tcp:8000 tcp:8000 >/dev/null
echo "→ tunnels rétablis :"
adb reverse --list | sed 's/^/     /'

# Sans Metro ni API, l'application s'ouvrirait sur une erreur.
curl -sf --max-time 5 http://127.0.0.1:8081 >/dev/null \
  && echo "→ Metro joignable" || echo "  ⚠ Metro ne répond pas — lancer : npx expo start --port 8081"
curl -sf --max-time 5 http://127.0.0.1:8000/health >/dev/null \
  && echo "→ API joignable" || echo "  ⚠ API ne répond pas — lancer : uvicorn main:app --port 8000"

echo "→ ouverture de l'application"
adb shell am start -a android.intent.action.VIEW -d "exp://127.0.0.1:8081" >/dev/null 2>&1
echo "Terminé."
