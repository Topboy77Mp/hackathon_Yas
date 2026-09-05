# Compiler l'APK — ce qu'il faut avant

L'application est prête. `expo prebuild --platform android` génère le projet
natif sans le moindre avertissement, et `expo export` produit le bundle de
production. **Il ne manque que la chaîne de compilation** : cette machine n'a ni
SDK Android, ni Gradle, ni `eas-cli`.

Deux voies. Choisis-en une.

---

## Voie A — EAS Build (recommandée)

Compilation sur les serveurs d'Expo. **Rien à installer sur la machine**, hormis
l'outil en ligne de commande. Il faut un compte Expo, gratuit.

    npm install -g eas-cli
    cd app
    eas login                    # crée le compte si besoin
    eas build:configure
    eas build --platform android --profile preview

Le profil `preview` produit un **APK** installable directement. Le profil
`production` produit un `.aab`, destiné au Play Store — ce n'est **pas** ce que
tu veux pour une démonstration.

Compte environ **15 à 25 minutes** d'attente, file d'attente comprise. Le lien
de téléchargement s'affiche à la fin.

**Point de vigilance** : ce build ne verra jamais la machine de développement. Il
faut donc que `EXPO_PUBLIC_API_BASE_URL` pointe sur une adresse joignable depuis
le téléphone — voir plus bas.

---

## Voie B — Build local

Tout se compile sur la machine. Plus long à mettre en place, mais sans compte ni
réseau une fois installé.

### À installer

| Élément | Version | Commande |
|---|---|---|
| JDK 17 | 17 | `sudo apt install openjdk-17-jdk` |
| Android SDK Platform 35 | 35 | via `cmdline-tools` |
| Build-Tools | 35.0.0 | via `sdkmanager` |
| Platform-Tools | à jour | via `sdkmanager` |

Java est **déjà présent** sur cette machine — vérifie seulement qu'il s'agit
bien du 17 : `java -version`.

    # Outils en ligne de commande du SDK
    mkdir -p ~/Android/Sdk/cmdline-tools
    cd ~/Android/Sdk/cmdline-tools
    wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
    unzip commandlinetools-linux-*.zip && mv cmdline-tools latest

    # Variables d'environnement (à ajouter à ~/.zshrc)
    export ANDROID_HOME="$HOME/Android/Sdk"
    export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools"

    # Composants
    sdkmanager --licenses
    sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"

Compter **2 à 3 Go** de téléchargement.

### Compiler

    cd app
    npm run prebuild:android     # régénère android/, non versionné
    npm run apk:local            # expo run:android --variant release

L'APK sort dans :

    app/android/app/build/outputs/apk/release/app-release.apk

---

## Avant de lancer le build — l'adresse de l'API

**C'est le point qui fait rater un APK.** Sur un téléphone, `localhost` désigne
le téléphone lui-même, pas la machine de développement. Un APK compilé avec
`localhost` affiche « connexion impossible » sur tous les écrans.

Renseigne `app/.env` **avant** la compilation :

    EXPO_PUBLIC_API_BASE_URL=http://192.168.X.X:8000
    EXPO_PUBLIC_DEMO_TOKEN=jokkoo-demo

- **Démonstration sur le Wi-Fi du lieu** : mets l'IP locale de la machine
  (`ip -4 addr show scope global`), et démarre l'API sur toutes les interfaces :

      uvicorn main:app --host 0.0.0.0 --port 8000

  Le téléphone et la machine doivent être sur le même réseau. Attention : les
  Wi-Fi publics isolent souvent les clients entre eux — teste avant le jour J.

- **API déployée** : mets l'URL publique. C'est plus sûr pour une démonstration,
  et le contrat place le déploiement en heure 40.

L'application ne se contente pas d'échouer : si elle vise `localhost` sur un
appareil, elle **le dit explicitement** dans son message d'erreur.

`EXPO_PUBLIC_DEMO_TOKEN` sert uniquement à l'écran « mot de passe oublié », faute
de passerelle SMS. **À laisser vide pour une vraie mise en production.**

---

## Vérifier l'APK une fois installé

    adb install -r app/android/app/build/outputs/apk/release/app-release.apk

`adb` est déjà installé sur cette machine.

À contrôler en priorité, parce que ce sont les choses invisibles au navigateur :

1. Le titre ne passe pas sous la barre de statut, ni les boutons sous la barre
   de geste.
2. L'introduction s'affiche une seule fois, à la première ouverture.
3. Le catalogue se charge — sinon, c'est l'adresse de l'API.
4. Le clavier ne masque ni le champ actif ni le bouton principal.
5. À l'installation, **aucune permission n'est demandée** : seule `INTERNET` est
   déclarée, et elle ne se demande pas à l'utilisateur.

---

## État de préparation

| Élément | État |
|---|---|
| `expo export --platform web` | ✅ réussi |
| `expo prebuild --platform android` | ✅ réussi, sans avertissement |
| Identifiant de paquet | ✅ `tg.kashflow.app` |
| Splash et icône adaptative | ✅ aux couleurs des tokens |
| Permissions | ✅ `INTERNET` seule |
| Safe areas | ✅ haut et bas |
| Version | `1.0.0` |
| Chaîne de compilation | ❌ à installer — voie A ou B |
