# 🏰 Crypt of the Sovereign

> **Action-RPG Dungeon Crawler en Pixel Art commercialisable**, optimisé pour **Steam** (via Electron) et **Itch.io** (HTML5 Web).

---

## ⚔️ Aperçu du Jeu

**Crypt of the Sovereign** plonge le joueur dans les profondeurs d'une crypte millénaire sous l'emprise du *Souverain Déchu*. 

- **3 Héros Asymétriques :**
  - **Chevalier Mystique :** Armure de plaques, entailles sacrées à 120°, barrière d'absorption et charge invincible.
  - **Archimage Arcanique :** Maître des sorts à distance, orbes arcaniques perforants et nova de givre.
  - **Assassin d'Ombre :** Vélocité furtive, dagues empoisonnées et voile d'ombre garantissant un coup critique létal.
- **Donjons Procéduraux :** Salles de combat, salles aux trésors, pièges à pointes, échoppe du marchand *Marius* et arène du Boss.
- **Inventaire & 4 Raretés d'Objets :** Commun, Rare, Épique et Légendaire avec effets passifs uniques.
- **Sanctuaire de Méta-Progression :** Forge, alchimiste, bénédiction de vitalité et récolte d'âmes persistantes.
- **Audio Dungeon-Synth :** Musique procédurale et bruitages dynamiques via Web Audio API (0 asset audio lourd).
- **Prise en charge Matérielle :** Clavier/Souris, Manettes Xbox/PlayStation via Gamepad API, Plein Écran F11, et 60 FPS constants.

---

## 🕹️ Commandes

| Action | Clavier / Souris | Manette Xbox / PlayStation |
| :--- | :--- | :--- |
| **Déplacement** | **ZQSD** / **WASD** / Flèches | **Stick Gauche** / D-Pad |
| **Attaque Principale** | **Clic Gauche** ou **J** | **Bouton X** (Carré) ou **RT** |
| **Compétence Spéciale** | **Clic Droit** ou **K** | **Bouton B** (Rond) ou **RB** |
| **Roulade / Esquive** | **Espace** ou **Shift** | **Bouton A** (Croix) |
| **Interagir (Coffres / Marchand / Escalier)** | **E** ou **Entrée** | **Bouton Y** (Triangle) |
| **Inventaire** | **I** ou **Tab** | **Select / Back** |
| **Potions (Soin / Mana)** | **1** (Soin) / **2** (Mana) | **D-Pad Haut / Gauche** |
| **Plein Écran** | **F11** | Menu Options |
| **Pause** | **Échap** | **Start** |

---

## 🚀 Installation & Lancement

### 1. Pré-requis
- Node.js v18+ ou v22+
- npm

### 2. Téléchargement et génération des Assets CC0
```bash
node fetch-assets.js
```

### 3. Lancer en mode Serveur Web Local
```bash
node server.js
# Ouvrir ensuite http://localhost:8085 dans votre navigateur
```

### 4. Lancer l'Application Bureau Desktop (Electron)
```bash
npm install
npm start
```

### 5. Compiler l'exécutable autonome pour Steam (.exe)
```bash
npm run dist
# L'exécutable portable est généré dans ./dist/
```

### 6. Lancer la Suite de Tests Automatisés
```bash
node test-game.js
```

---

## 📜 Documentation

- Guide de publication officiel : [`GUIDE_PUBLICATION_STEAM.md`](GUIDE_PUBLICATION_STEAM.md)
- Licence : MIT / CC0 Public Domain pour les assets.
