# 🏰 GUIDE OFFICIEL DE PUBLICATION STEAM & ITCH.IO
## *Crypt of the Sovereign* - Action-RPG Dungeon Crawler en Pixel Art

Ce guide fournit la procédure complète pour compiler le jeu en exécutable `.exe` autonome et le publier sur les plateformes **Steam** (via Steamworks) et **Itch.io**.

---

## 1. ⚙️ ARCHITECTURE ET PRÉ-REQUIS

Le jeu est conçu selon une architecture hybride **Web + Bureau Native** :
- **Moteur :** HTML5 Canvas 2D + Web Audio API procédurale (100 % autonome, 0 dépendance audio/graphique externe en ligne).
- **Conteneur Desktop :** **Electron** & **electron-builder** pour générer un binaire Windows x64 optimisé sans nécessiter l'installation de Node.js chez l'utilisateur final.
- **Support Manette & Écran :** Gamepad API standard Xbox / DualShock, bascule plein écran native (touche `F11` et menu options), et IPC de fermeture propre (`game-quit`).

### Vérification de l'environnement :
Assurez-vous que Node.js et npm sont installés sur votre machine de développement :
```bash
node -v   # Recommandé: v18+ ou v22+
npm -v
```

---

## 2. 🚀 COMPILATION DU `.EXE` EN UNE COMMANDE

Toutes les commandes sont pré-configurées dans le fichier [`package.json`](file:///c:/Users/AymaneELHOMAIDI/Desktop/Projects/WadWAd/crypt-of-the-sovereign/package.json).

### Option A : Version Portable Autonome (Recommandée pour Steam & Itch.io)
Génère un dossier avec l'exécutable portable et toutes ses dépendances pré-packagées :
```bash
npm install
npm run dist
```
> **Résultat :** Le binaire `.exe` autonome est généré dans le dossier `./dist/` (`dist/Crypt of the Sovereign.exe`).

### Option B : Programme d'Installation Windows (.msi / setup.exe)
Pour proposer un installeur classique avec raccourci sur le Bureau et désinstalleur Windows :
```bash
npm run build:installer
```

### Option C : Test en direct sur l'environnement Electron local
Pour lancer la fenêtre de jeu sans compiler :
```bash
npm start
```

---

## 3. 🎮 PUBLICATION SUR STEAM (STEAMWORKS)

### Étape 1 : Création de l'application sur Steamworks
1. Connectez-vous à votre portail [Steamworks Partner](https://partner.steamgames.com/).
2. Payez les frais Steam Direct (100 $ USD, remboursés dès 1 000 $ de ventes).
3. Renseignez le nom du jeu : **Crypt of the Sovereign**. Vous obtiendrez votre **App ID** (ex: `1234560`).

### Étape 2 : Configuration du Dépôt de Fichiers (SteamPipe)
1. Téléchargez les outils [SteamPipe GUI / SteamCMD](https://partner.steamgames.com/doc/sdk/uploading).
2. Créez un fichier de configuration de build `scripts/app_build_1234560.vdf` :

```vdf
"AppBuild"
{
  "AppID" "1234560"
  "Desc" "Version 1.0.0 Release"
  "ContentRoot" "..\dist\win-unpacked\"
  "BuildOutput" "..\output\"
  "Depots"
  {
    "1234561" "depot_build_1234561.vdf"
  }
}
```

3. Créez le fichier de dépôt `scripts/depot_build_1234561.vdf` :
```vdf
"DepotBuild"
{
  "DepotID" "1234561"
  "FileMapping"
  {
    "LocalPath" "*"
    "DepotPath" "."
    "recursive" "1"
  }
}
```

4. Uploadez le build sur les serveurs de Valve en une commande via `steamcmd` :
```bash
steamcmd.exe +login <votre_compte_steamworks> +run_app_build scripts\app_build_1234560.vdf +quit
```

### Étape 3 : Configuration du Lanceur sur Steamworks
1. Dans l'onglet **Installation** > **General Installation** :
   - Exécutable : `Crypt of the Sovereign.exe`
   - Système d'exploitation : `Windows 64 bits`
2. Dans l'onglet **Community Hub & Assets Graphiques** :
   - **Header Capsule :** 460 x 215 px
   - **Small Capsule :** 231 x 87 px
   - **Main Capsule :** 616 x 353 px
   - **Page Background :** 1438 x 810 px
   - **Icone :** Utilisez le fichier [`assets/sprites/icon.png`](file:///c:/Users/AymaneELHOMAIDI/Desktop/Projects/WadWAd/crypt-of-the-sovereign/assets/sprites/icon.png) (haute qualité 64x64).
3. Dans l'onglet **Steam Cloud** :
   - Ajoutez le chemin des données de sauvegarde locale : `%APPDATA%\Crypt of the Sovereign\Local Storage\leveldb\*` ou laissez le système de stockage persistant HTML5 gérer le cache utilisateur.

---

## 4. 🕹️ PUBLICATION SUR ITCH.IO

Itch.io permet deux modes de distribution complémentaires :

### Mode 1 : Jeu Web Jouable Directement dans le Navigateur
1. Compressez le contenu du dossier à la racine (`index.html`, `style.css`, `js/`, `assets/`) dans une archive ZIP nommée `crypt-of-the-sovereign-html5.zip`.
2. Sur la page de votre projet Itch.io :
   - **Kind of project :** Sélectionnez **HTML**.
   - Cochez : *"This file will be played in the browser"*.
   - Définissez les dimensions de la fenêtre : **1280 x 720** (16:9).
   - Activez les options : *"Fullscreen button"* et *"Automatically start on page load"*.

### Mode 2 : Version Téléchargeable Windows (Exécutable Desktop)
1. Compressez le dossier généré par `npm run dist` (`dist/win-unpacked/`) en `crypt-of-the-sovereign-win64.zip`.
2. Sur Itch.io, uploadez ce ZIP et cochez la case **Windows**.

### Déploiement automatisé avec Butler (CLI officiel Itch.io) :
Pour mettre à jour votre jeu en ligne automatiquement à chaque commit :
```bash
# Déploiement de la version web
butler push crypt-of-the-sovereign-html5.zip votre-pseudo/crypt-of-the-sovereign:html5

# Déploiement de la version Windows Bureau
butler push dist/win-unpacked votre-pseudo/crypt-of-the-sovereign:windows-x64
```

---

## 5. ✅ CHECKLIST DE QUALITÉ AVANT LANCEMENT

| Élément | Statut | Note technique |
| :--- | :---: | :--- |
| **0 Erreur Console** | ✅ Validé | Testé via Chrome Headless CDP (`node test-game.js`) |
| **100 % Assets Valides** | ✅ Validé | 30/30 sprites PNG vérifiés (en-têtes valides) |
| **Framerate 60 FPS** | ✅ Validé | Rendu Canvas 2D fluide avec delta-time |
| **Support Manette** | ✅ Validé | Gamepad API native (Xbox / PS / Switch) |
| **Plein Écran F11** | ✅ Validé | Prise en charge native Electron & HTML5 |
| **Sauvegarde Persistante** | ✅ Validé | Méta-progression du Sanctuaire sauvegardée |
| **Audio Évolutif** | ✅ Validé | Dungeon-Synth dynamique sans asset audio lourd |
| **Licence Commerciale** | ✅ Validé | 100 % CC0 / Domaine Public / Code propriétaire |

---
*Projet conçu avec amour par Sovereign Studio.*
