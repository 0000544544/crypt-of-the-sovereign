/**
 * CRYPT OF THE SOVEREIGN - MAIN GAME ENGINE
 * Action-RPG Dungeon Crawler en Pixel Art.
 * Orchestration complète : boucle de rendu 60 FPS, caméra, minimap, états, UI et logique de jeu.
 */

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    // Systèmes
    this.sound = new SoundEngine();
    this.storage = new StorageManager();
    this.input = new InputManager(this.canvas);
    this.inventory = new InventoryManager();

    // Cache des sprites
    this.sprites = {};
    this.spritesLoaded = false;

    // État du jeu
    this.state = 'TITLE'; // 'TITLE', 'SELECT_CLASS', 'SANCTUARY', 'PLAYING', 'INVENTORY', 'SHOP', 'PAUSE', 'GAME_OVER', 'VICTORY'
    this.selectedClassId = 'knight';
    this.currentFloorNumber = 1;
    this.dungeon = null;
    this.player = null;
    // Entités et particules
    this.enemies = [];
    this.projectiles = [];
    this.drops = [];
    this.damageNumbers = [];
    this.shockwaves = [];
    this.particles = new ParticleManager();
    this.currentRoom = null;
    this.invFullCooldown = 0;

    // V4 Action-RPG : Tension, Freeze-Frame & Gouffres
    this.hitFreezeTimer = 0;
    this.tension = 0;
    this.tensionMultiplier = 1.0;
    this.lastChasmDamageTimer = 0;
    this.lastSafePos = { x: 0, y: 0 };
    this.selectedBagIndex = -1;

    // Caméra & Zoom 2.5D
    this.camera = { x: 0, y: 0 };
    this.screenShake = 0;
    this.zoom = 2.0;

    // Statistiques de la partie en cours
    this.runStats = {
      floor: 1,
      kills: 0,
      bosses: 0,
      soulsEarned: 0,
      goldEarned: 0,
      damageDealt: 0,
      damageTaken: 0,
      completed: false
    };

    // Cache des éléments du DOM
    this.dom = {
      uiOverlay: document.getElementById('uiOverlay'),
      screenTitle: document.getElementById('screenTitle'),
      screenSelectClass: document.getElementById('screenSelectClass'),
      screenSanctuary: document.getElementById('screenSanctuary'),
      screenInventory: document.getElementById('screenInventory'),
      screenShop: document.getElementById('screenShop'),
      screenPause: document.getElementById('screenPause'),
      screenGameOver: document.getElementById('screenGameOver'),
      screenOptions: document.getElementById('screenOptions'),
      hud: document.getElementById('gameHud'),
      bossHud: document.getElementById('bossHud'),
      bossBarFill: document.getElementById('bossBarFill'),
      bossName: document.getElementById('bossName'),
      hpBarFill: document.getElementById('hpBarFill'),
      manaBarFill: document.getElementById('manaBarFill'),
      staminaBarFill: document.getElementById('staminaBarFill'),
      hpText: document.getElementById('hpText'),
      manaText: document.getElementById('manaText'),
      staminaText: document.getElementById('staminaText'),
      hudFloor: document.getElementById('hudFloor'),
      hudGold: document.getElementById('hudGold'),
      hudSouls: document.getElementById('hudSouls'),
      hudPotionHp: document.getElementById('hudPotionHp'),
      hudPotionMana: document.getElementById('hudPotionMana'),
      tensionBarFill: document.getElementById('tensionBarFill'),
      tensionText: document.getElementById('tensionText'),
      interactionPrompt: document.getElementById('interactionPrompt'),
      minimapCanvas: document.getElementById('minimapCanvas')
    };

    this.minimapCtx = this.dom.minimapCanvas ? this.dom.minimapCanvas.getContext('2d') : null;

    this.lastTime = performance.now();
    this.init();
  }

  async init() {
    this.bindDomEvents();

    // Application des volumes sauvegardés dans settings
    const settings = this.storage.data.settings || { masterVolume: 0.7, musicVolume: 0.5, sfxVolume: 0.8 };
    this.sound.setVolumes(settings.masterVolume, settings.musicVolume, settings.sfxVolume);
    const sliderMaster = document.getElementById('sliderMasterVol');
    const sliderMusic = document.getElementById('sliderMusicVol');
    const sliderSfx = document.getElementById('sliderSfxVol');
    if (sliderMaster) sliderMaster.value = settings.masterVolume;
    if (sliderMusic) sliderMusic.value = settings.musicVolume;
    if (sliderSfx) sliderSfx.value = settings.sfxVolume;

    await this.preloadSprites();
    this.sound.playMusic('hub');
    this.renderSanctuaryUI();
    this.showScreen('TITLE');

    // Démarrage de la boucle principale
    requestAnimationFrame((t) => this.loop(t));
  }

  async preloadSprites() {
    const spriteList = [
      'hero_knight.png', 'hero_mage.png', 'hero_rogue.png',
      'enemy_swarmer.png', 'enemy_archer.png', 'enemy_mage.png', 'enemy_tank.png', 'enemy_boss.png',
      'tile_floor.png', 'tile_floor_cracked.png', 'tile_floor_moss.png', 'tile_wall.png', 'tile_door_closed.png', 'tile_door_open.png', 'tile_stairs.png',
      'tile_torch.png', 'tile_chest_closed.png', 'tile_chest_open.png', 'tile_spikes.png', 'tile_shopkeeper.png',
      'tile_barrel.png', 'tile_urn.png', 'tile_chasm.png', 'tile_bridge.png', 'tile_altar.png',
      'tile_decor_bones.png', 'tile_decor_chains.png', 'tile_decor_puddle.png',
      'item_sword.png', 'item_staff.png', 'item_dagger.png', 'item_armor_heavy.png', 'item_armor_robe.png',
      'item_armor_leather.png', 'item_ring.png', 'item_potion_health.png', 'item_potion_mana.png',
      'item_coin.png', 'item_soul_gem.png', 'icon.png',
      'item_rune_fire.png', 'item_rune_lifesteal.png', 'item_rune_haste.png', 'item_rune_frost.png',
      'item_gem_ruby.png', 'item_gem_sapphire.png', 'item_gem_emerald.png'
    ];

    const promises = spriteList.map(name => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = `assets/sprites/${name}`;
        img.onload = () => {
          this.sprites[name] = img;
          resolve();
        };
        img.onerror = () => {
          console.warn(`[SPRITE] Échec de chargement pour ${name}, utilisation d'un canevas de secours.`);
          this.sprites[name] = img;
          resolve();
        };
      });
    });

    await Promise.all(promises);
    this.spritesLoaded = true;
    console.log(`[ASSETS] ${Object.keys(this.sprites).length} sprites chargés en mémoire.`);
  }

  bindDomEvents() {
    // Boutons Écran Titre
    document.getElementById('btnStartGame')?.addEventListener('click', () => {
      this.sound.init();
      this.showScreen('SELECT_CLASS');
    });

    document.getElementById('btnSanctuary')?.addEventListener('click', () => {
      this.sound.init();
      this.renderSanctuaryUI();
      this.showScreen('SANCTUARY');
    });

    document.getElementById('btnOptionsTitle')?.addEventListener('click', () => {
      this.showScreen('OPTIONS');
    });

    document.getElementById('btnQuitGame')?.addEventListener('click', () => {
      this.input.quitGame();
    });

    // Cartes de sélection de classe
    document.querySelectorAll('.class-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.class-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedClassId = card.dataset.classId;
      });
    });

    document.getElementById('btnConfirmClass')?.addEventListener('click', () => {
      this.sound.init();
      this.sound.resume();
      this.startRun(this.selectedClassId);
    });

    // Boutons interactifs du HUD en jeu
    document.getElementById('btnToggleInventoryHud')?.addEventListener('click', () => {
      if (this.state === 'PLAYING') this.showScreen('INVENTORY');
      else if (this.state === 'INVENTORY') this.closeModal();
    });

    document.querySelectorAll('.potion-slot').forEach(slot => {
      if (slot.title && slot.title.includes('Soin')) {
        slot.addEventListener('click', () => {
          if (this.player) this.inventory.usePotion('health', this.player, this.sound);
        });
      } else if (slot.title && slot.title.includes('Mana')) {
        slot.addEventListener('click', () => {
          if (this.player) this.inventory.usePotion('mana', this.player, this.sound);
        });
      }
    });

    document.getElementById('btnBackToTitle')?.addEventListener('click', () => {
      this.showScreen('TITLE');
    });

    // Boutons Sanctuaire
    document.getElementById('btnBackFromSanctuary')?.addEventListener('click', () => {
      this.showScreen('TITLE');
    });

    // Boutons Pause & Options
    document.getElementById('btnResumeGame')?.addEventListener('click', () => {
      this.resumeGame();
    });

    document.getElementById('btnOptionsFromPause')?.addEventListener('click', () => {
      this.showScreen('OPTIONS');
    });

    document.getElementById('btnAbandonRun')?.addEventListener('click', () => {
      this.endRun(false, 'Expédition abandonnée par le héros.');
    });

    document.getElementById('btnCloseOptions')?.addEventListener('click', () => {
      if (this.previousState === 'PAUSE') this.showScreen('PAUSE');
      else this.showScreen('TITLE');
    });

    // Curseurs de volume
    const masterSlider = document.getElementById('sliderMasterVol');
    const musicSlider = document.getElementById('sliderMusicVol');
    const sfxSlider = document.getElementById('sliderSfxVol');

    const updateVolumes = () => {
      const m = parseFloat(masterSlider.value);
      const mu = parseFloat(musicSlider.value);
      const s = parseFloat(sfxSlider.value);
      this.sound.setVolumes(m, mu, s);
      this.storage.data.settings.masterVolume = m;
      this.storage.data.settings.musicVolume = mu;
      this.storage.data.settings.sfxVolume = s;
      this.storage.save();
    };

    masterSlider?.addEventListener('input', updateVolumes);
    musicSlider?.addEventListener('input', updateVolumes);
    sfxSlider?.addEventListener('input', updateVolumes);

    document.getElementById('btnToggleFullscreen')?.addEventListener('click', () => {
      this.input.toggleFullscreen();
    });

    // Boutons Game Over
    document.getElementById('btnReturnToSanctuary')?.addEventListener('click', () => {
      this.showScreen('SANCTUARY');
      this.renderSanctuaryUI();
      this.sound.playMusic('hub');
    });

    // Fermeture Inventaire & Boutique
    document.getElementById('btnCloseInventory')?.addEventListener('click', () => {
      this.closeModal();
    });

    document.getElementById('btnCloseShop')?.addEventListener('click', () => {
      this.closeModal();
    });
  }

  showScreen(screenName) {
    this.previousState = this.state;
    this.state = screenName;

    // Masquage de tous les conteneurs d'écrans
    const screens = [
      this.dom.screenTitle, this.dom.screenSelectClass, this.dom.screenSanctuary,
      this.dom.screenInventory, this.dom.screenShop, this.dom.screenPause,
      this.dom.screenGameOver, this.dom.screenOptions
    ];
    screens.forEach(s => { if (s) s.style.display = 'none'; });

    // Masquage ou affichage du HUD
    if (screenName === 'PLAYING') {
      if (this.dom.hud) this.dom.hud.style.display = 'flex';
      return;
    } else {
      if (this.dom.hud) this.dom.hud.style.display = 'none';
    }

    switch (screenName) {
      case 'TITLE':
        if (this.dom.screenTitle) this.dom.screenTitle.style.display = 'flex';
        break;
      case 'SELECT_CLASS':
        if (this.dom.screenSelectClass) this.dom.screenSelectClass.style.display = 'flex';
        break;
      case 'SANCTUARY':
        if (this.dom.screenSanctuary) this.dom.screenSanctuary.style.display = 'flex';
        break;
      case 'INVENTORY':
        if (this.dom.screenInventory) this.dom.screenInventory.style.display = 'flex';
        this.renderInventoryUI();
        break;
      case 'SHOP':
        if (this.dom.screenShop) this.dom.screenShop.style.display = 'flex';
        this.renderShopUI();
        break;
      case 'PAUSE':
        if (this.dom.screenPause) this.dom.screenPause.style.display = 'flex';
        break;
      case 'GAME_OVER':
        if (this.dom.screenGameOver) this.dom.screenGameOver.style.display = 'flex';
        break;
      case 'OPTIONS':
        if (this.dom.screenOptions) this.dom.screenOptions.style.display = 'flex';
        break;
    }
  }

  closeModal() {
    this.showScreen('PLAYING');
  }

  startRun(classId) {
    this.currentFloorNumber = 1;
    this.runStats = {
      floor: 1,
      kills: 0,
      bosses: 0,
      soulsEarned: 0,
      goldEarned: 0,
      damageDealt: 0,
      damageTaken: 0,
      completed: false
    };

    const classDef = HERO_CLASSES[classId] || HERO_CLASSES.knight;
    const metaBonuses = this.storage.getSanctuaryBonuses();

    this.player = new Player(classDef, metaBonuses);
    this.inventory = new InventoryManager();

    // Potions de départ avec bonus de l'alchimiste
    this.inventory.potions.health = 2 + (metaBonuses.alchemist.bonusPotions || 0);
    this.inventory.potions.mana = 1;

    // Arme de départ initiale
    const startingWeapon = ItemGenerator.createItem(1, 'common', 'weapon');
    this.inventory.equipped.weapon = startingWeapon;
    this.player.applyEquipmentStats(this.inventory.getNetEquipmentStats());

    this.loadFloor(1);
    this.showScreen('PLAYING');
    this.sound.playMusic('explore');
  }

  loadFloor(floorNumber) {
    this.currentFloorNumber = floorNumber;
    this.runStats.floor = floorNumber;
    this.roomKills = 0;
    this.tension = 0;
    this.tensionMultiplier = 1.0;
    this.lastChasmDamageTimer = 0;
    if (this.player) {
      this.player.aegisUsedThisFloor = false;
    }
    this.dungeon = new DungeonFloor(floorNumber, 60, 60);

    // Positionner le joueur dans la salle de départ
    this.player.x = this.dungeon.startRoom.cx * TILE_SIZE + TILE_SIZE / 2;
    this.player.y = this.dungeon.startRoom.cy * TILE_SIZE + TILE_SIZE / 2;
    this.lastSafePos = { x: this.player.x, y: this.player.y };

    this.enemies = [];
    this.projectiles = [];
    this.drops = [];
    this.damageNumbers = [];
    this.shockwaves = [];
    this.particles = new ParticleManager();
    this.currentRoom = this.dungeon.startRoom;

    // Faire apparaître les monstres dans les salles de combat
    for (const room of this.dungeon.rooms) {
      if (room.type === 'combat') {
        const enemyCount = Math.floor(Math.random() * 3) + 3 + floorNumber;
        for (let i = 0; i < enemyCount; i++) {
          const ex = (room.x + 1 + Math.random() * (room.w - 2)) * TILE_SIZE;
          const ey = (room.y + 1 + Math.random() * (room.h - 2)) * TILE_SIZE;

          const types = ['swarmer', 'archer', 'mage', 'tank'];
          const randType = types[Math.floor(Math.random() * types.length)];
          this.enemies.push(new Enemy(randType, ex, ey, floorNumber));
        }
      } else if (room.type === 'boss') {
        // Faire apparaître le Boss au centre de l'arène
        const bx = room.cx * TILE_SIZE + TILE_SIZE / 2;
        const by = (room.cy - 1) * TILE_SIZE + TILE_SIZE / 2;
        this.enemies.push(new Enemy('boss', bx, by, floorNumber));
      }
    }

    if (this.dom.hudFloor) this.dom.hudFloor.textContent = `Étage ${floorNumber}`;
  }

  nextFloor() {
    this.sound.playVictory();
    this.loadFloor(this.currentFloorNumber + 1);
    this.sound.playMusic('explore');
  }

  endRun(victory, reasonText) {
    this.runStats.completed = victory;
    this.storage.recordRunEnd(this.runStats);

    if (this.dom.screenGameOver) {
      const title = document.getElementById('gameOverTitle');
      const desc = document.getElementById('gameOverDesc');
      const recapKills = document.getElementById('recapKills');
      const recapBosses = document.getElementById('recapBosses');
      const recapFloor = document.getElementById('recapFloor');
      const recapSouls = document.getElementById('recapSouls');

      if (title) title.textContent = victory ? 'VICTOIRE GLORIEUSE' : 'VOUS AVEZ SUCCOMBÉ';
      if (title) title.style.color = victory ? '#fbbf24' : '#ef4444';
      if (desc) desc.textContent = reasonText || (victory ? 'Le Souverain Déchu a été vaincu !' : 'Votre âme rejoint les profondeurs de la crypte...');
      if (recapKills) recapKills.textContent = this.runStats.kills;
      if (recapBosses) recapBosses.textContent = this.runStats.bosses;
      if (recapFloor) recapFloor.textContent = this.runStats.floor;
      if (recapSouls) recapSouls.textContent = `+${this.runStats.soulsEarned}`;
    }

    if (victory) this.sound.playVictory();
    else this.sound.playGameOver();

    this.showScreen('GAME_OVER');
  }

  resumeGame() {
    this.showScreen('PLAYING');
  }

  destroyDestructible(dest) {
    if (!dest || dest.destroyed) return;
    dest.destroyed = true;
    dest.hp = 0;
    this.hitFreezeTimer = 0.05;
    this.sound.playHit();
    this.particles.addDebrisBurst(dest.x, dest.y, dest.type);

    if (dest.content === 'gold') {
      const val = Math.round((12 + Math.random() * 14) * this.tensionMultiplier);
      this.drops.push(new DropItem(dest.x, dest.y, { type: 'gold', value: val }));
    } else if (dest.content === 'soul' || dest.content === 'souls') {
      const val = Math.round((8 + Math.random() * 8) * this.tensionMultiplier);
      this.drops.push(new DropItem(dest.x, dest.y, { type: 'soul', value: val }));
    } else if (dest.content === 'rune') {
      this.drops.push(new DropItem(dest.x, dest.y, { type: 'item', item: ItemGenerator.createRuneOrGem(this.currentFloorNumber) }));
      this.damageNumbers.push(new DamageNumber(dest.x, dest.y - 15, 'Rune Découverte !', '#38bdf8', true));
    } else if (dest.content === 'item') {
      this.drops.push(new DropItem(dest.x, dest.y, { type: 'item', item: ItemGenerator.createItem(this.currentFloorNumber) }));
    } else if (dest.content === 'gas' || dest.content === 'trap_gas') {
      this.particles.addAcidCloud(dest.x, dest.y, 20);
      this.damageNumbers.push(new DamageNumber(dest.x, dest.y - 15, 'PIÈGE DE GAZ !', '#22c55e', true));
      if (Math.hypot(this.player.x - dest.x, this.player.y - dest.y) < 45) {
        this.player.takeDamage(15, this.sound, this.damageNumbers, 'Nuage de Gaz');
      }
    }
  }

  // --- BOUCLE PRINCIPALE 60 FPS ---
  loop(timestamp) {
    const dt = Math.min(0.1, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    if (this.invFullCooldown > 0) this.invFullCooldown -= dt;

    // Freeze-Frame lors des impacts critiques ou destructions
    if (this.hitFreezeTimer > 0) {
      this.hitFreezeTimer -= dt;
      this.input.clearJustPressed();
      return;
    }

    // Escalade de la Tension / Jauge d'Angoisse (augmente le danger et multiplie le loot jusqu'à 2.5x)
    this.tension = Math.min(100, this.tension + dt * 1.25);
    this.tensionMultiplier = 1.0 + (this.tension / 100) * 1.5;

    // Raccourcis universels
    if (this.input.justPressed.pause) {
      if (this.state === 'PLAYING') this.showScreen('PAUSE');
      else if (this.state === 'PAUSE' || this.state === 'INVENTORY' || this.state === 'SHOP') this.resumeGame();
    }

    if (this.input.justPressed.inventory && (this.state === 'PLAYING' || this.state === 'INVENTORY')) {
      if (this.state === 'PLAYING') this.showScreen('INVENTORY');
      else this.closeModal();
    }

    if (this.state !== 'PLAYING') {
      this.input.clearJustPressed();
      return;
    }

    // 1. Mise à jour de l'Input avec position du joueur sur l'écran (avec échelle de zoom 2.0x)
    const screenPx = (this.player.x - this.camera.x) * this.zoom;
    const screenPy = (this.player.y - this.camera.y) * this.zoom;
    this.input.update(screenPx, screenPy);

    // Utilisation rapide des potions (touches 1 et 2)
    if (this.input.justPressed.potion1) {
      this.inventory.usePotion('health', this.player, this.sound);
    }
    if (this.input.justPressed.potion2) {
      this.inventory.usePotion('mana', this.player, this.sound);
    }

    // 2. Mise à jour du Joueur
    this.player.update(dt, this.input, this.dungeon, this.sound, this.projectiles, this.damageNumbers);

    // Vérification des Gouffres (Chasms) et Dégâts de chute
    if (this.lastChasmDamageTimer > 0) this.lastChasmDamageTimer -= dt;
    if (this.dungeon && !this.dungeon.isChasm(this.player.x, this.player.y) && this.dungeon.isWalkable(this.player.x, this.player.y, this.player.radius)) {
      this.lastSafePos.x = this.player.x;
      this.lastSafePos.y = this.player.y;
    } else if (this.dungeon && this.dungeon.isChasm(this.player.x, this.player.y) && !this.player.isRolling && !this.dungeon.isBridge(this.player.x, this.player.y)) {
      if (this.lastChasmDamageTimer <= 0) {
        this.lastChasmDamageTimer = 0.8;
        this.player.takeDamage(20, this.sound, this.damageNumbers, 'Chute dans le Gouffre');
        this.screenShake = Math.max(this.screenShake, 10);
        this.damageNumbers.push(new DamageNumber(this.player.x, this.player.y - 25, 'CHUTE ! -20 PV', '#9333ea', true));
        this.player.x = this.lastSafePos.x;
        this.player.y = this.lastSafePos.y;
        this.player.vx = 0;
        this.player.vy = 0;
      }
    }

    // Vérification de la mort du joueur
    if (this.player.hp <= 0) {
      this.endRun(false, 'Vos blessures vous ont été fatales.');
      this.input.clearJustPressed();
      return;
    }

    // 3. Mise à jour de la Caméra fluide (Zoom immersif x2.0)
    const targetCamX = this.player.x - (this.canvas.width / 2) / this.zoom;
    const targetCamY = this.player.y - (this.canvas.height / 2) / this.zoom;
    this.camera.x += (targetCamX - this.camera.x) * 8 * dt;
    this.camera.y += (targetCamY - this.camera.y) * 8 * dt;

    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 25);
    }

    // 4. Brouillard de guerre et visibilité
    this.dungeon.updateFog(this.player.x, this.player.y, 280);

    // Événement Salle de Défi (Gauntlet)
    if (this.dungeon.gauntlet && !this.dungeon.gauntlet.completed) {
      const gnt = this.dungeon.gauntlet;
      const distToGauntlet = Math.hypot(this.player.x - gnt.x, this.player.y - gnt.y);
      if (!gnt.triggered && distToGauntlet < 140) {
        gnt.triggered = true;
        gnt.active = true;
        gnt.wave = 1;
        gnt.enemiesAlive = [];
        this.sound.playBossRoar();
        this.screenShake = Math.max(this.screenShake, 14);
        this.damageNumbers.push(new DamageNumber(this.player.x, this.player.y - 30, 'ÉPREUVE DU GAUNTLET : VAGUE 1/2 !', '#f59e0b', true));

        const types = ['swarmer', 'archer', 'tank', 'swarmer'];
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * Math.PI * 2;
          const ex = gnt.x + Math.cos(angle) * 110;
          const ey = gnt.y + Math.sin(angle) * 110;
          const en = new Enemy(types[i], ex, ey, this.currentFloorNumber);
          this.enemies.push(en);
          gnt.enemiesAlive.push(en);
          this.particles.addDeathBurst(ex, ey, '#f59e0b', 20);
        }
      } else if (gnt.active) {
        gnt.enemiesAlive = gnt.enemiesAlive.filter(e => e.hp > 0);
        if (gnt.enemiesAlive.length === 0) {
          if (gnt.wave === 1) {
            gnt.wave = 2;
            this.sound.playBossRoar();
            this.screenShake = Math.max(this.screenShake, 14);
            this.damageNumbers.push(new DamageNumber(this.player.x, this.player.y - 30, 'ÉPREUVE DU GAUNTLET : VAGUE FINALE !', '#ef4444', true));
            const types = ['tank', 'mage', 'archer', 'swarmer'];
            for (let i = 0; i < 4; i++) {
              const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
              const ex = gnt.x + Math.cos(angle) * 110;
              const ey = gnt.y + Math.sin(angle) * 110;
              const en = new Enemy(types[i], ex, ey, this.currentFloorNumber + 1);
              this.enemies.push(en);
              gnt.enemiesAlive.push(en);
              this.particles.addDeathBurst(ex, ey, '#ef4444', 25);
            }
          } else {
            gnt.active = false;
            gnt.completed = true;
            this.sound.playVictory();
            this.damageNumbers.push(new DamageNumber(gnt.x, gnt.y - 35, 'GAUNTLET PURIFIÉ ! COFFRE D\'OR APPARU !', '#fbbf24', true));
            const grandLoot = ItemGenerator.createItem(this.currentFloorNumber, 'legendary');
            this.dungeon.chests.push({
              x: gnt.x,
              y: gnt.y,
              opened: false,
              loot: grandLoot
            });
            this.drops.push(new DropItem(gnt.x - 20, gnt.y, { type: 'item', item: ItemGenerator.createRuneOrGem(this.currentFloorNumber) }));
            this.drops.push(new DropItem(gnt.x + 20, gnt.y, { type: 'gold', value: 120 }));
            this.particles.addDeathBurst(gnt.x, gnt.y, '#fbbf24', 50);
          }
        }
      }
    }

    // Vérification du changement de salle pour réinitialiser Tempête d'Âmes
    const pTileX = Math.floor(this.player.x / TILE_SIZE);
    const pTileY = Math.floor(this.player.y / TILE_SIZE);
    let currentRoomFound = null;
    for (const r of this.dungeon.rooms) {
      if (pTileX >= r.x && pTileX < r.x + r.w && pTileY >= r.y && pTileY < r.y + r.h) {
        currentRoomFound = r;
        break;
      }
    }
    if (currentRoomFound && currentRoomFound !== this.currentRoom) {
      this.currentRoom = currentRoomFound;
      this.roomKills = 0;
    }

    // Braises des torches visibles
    for (const torch of this.dungeon.torches) {
      const ttx = Math.floor(torch.x / TILE_SIZE);
      const tty = Math.floor(torch.y / TILE_SIZE);
      if (this.dungeon.visible[tty]?.[ttx] === 1 && Math.random() < 0.25) {
        this.particles.addTorchEmber(torch.x + 16, torch.y + 16);
      }
    }

    // 5. Gestion des attaques de mêlée du joueur
    if (this.player.activeMeleeHitbox) {
      const hb = this.player.activeMeleeHitbox;
      const numHits = hb.hits || 1;
      let finalDamage = hb.damage;

      // Passif Tempête d'Âmes : +25% dégâts par ennemi tué dans la salle
      if (this.player.passives && this.player.passives.some(p => p.includes("Tempête d'Âmes"))) {
        const soulStormBonus = 1 + Math.min(2.0, (this.roomKills || 0) * 0.25);
        finalDamage = Math.round(finalDamage * soulStormBonus);
      }

      // Destructibles touchés par l'attaque de mêlée
      if (this.dungeon && this.dungeon.destructibles) {
        for (const dest of this.dungeon.destructibles) {
          if (!dest.destroyed) {
            const dist = Math.hypot(dest.x - this.player.x, dest.y - this.player.y);
            if (dist <= hb.range + dest.radius) {
              const angleToDest = Math.atan2(dest.y - this.player.y, dest.x - this.player.x);
              let diff = angleToDest - hb.angle;
              while (diff < -Math.PI) diff += Math.PI * 2;
              while (diff > Math.PI) diff -= Math.PI * 2;
              if (Math.abs(diff) <= hb.arc / 2) {
                dest.hp -= finalDamage;
                this.particles.addHitSpark(dest.x, dest.y, '#f59e0b', 6);
                if (dest.hp <= 0) {
                  this.destroyDestructible(dest);
                }
              }
            }
          }
        }
      }

      for (const e of this.enemies) {
        if (!hb.hitSet.has(e)) {
          const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y);
          if (dist <= hb.range + e.radius) {
            const angleToEnemy = Math.atan2(e.y - this.player.y, e.x - this.player.x);
            let diff = angleToEnemy - hb.angle;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;

            if (Math.abs(diff) <= hb.arc / 2) {
              hb.hitSet.add(e);
              let totalDealt = 0;
              for (let h = 0; h < numHits; h++) {
                totalDealt += e.takeDamage(finalDamage, this.sound, this.damageNumbers, hb.isCrit);
              }
              this.runStats.damageDealt += totalDealt;

              // Juice visuel & impacts V4 (Freeze-frame, taches de sang persistantes, squash)
              this.hitFreezeTimer = 0.05;
              this.particles.addBloodSplat(e.x, e.y);
              e.squashTimer = 0.2;

              if (hb.isCrit) {
                this.screenShake = Math.max(this.screenShake, 7);
              }
              this.particles.addHitSpark(e.x, e.y, hb.isCrit ? '#f59e0b' : '#ef4444', hb.isCrit ? 12 : 7);

              // Effets de Runes et Gemmes serties
              if (this.player.fireBurn) {
                e.burnTimer = 3.0;
                e.burnDps = this.player.fireBurn;
              }
              if (this.player.frostChance && Math.random() < this.player.frostChance) {
                e.freezeTimer = Math.max(e.freezeTimer, 2.0);
              }
              if (this.player.lifesteal) {
                this.player.heal(Math.max(1, Math.round(totalDealt * this.player.lifesteal)));
              }

              // Passif Vampirisme (8% de soins de classe)
              if (this.player.passives && this.player.passives.some(p => p.includes('Vampirisme'))) {
                this.player.heal(Math.max(1, Math.round(totalDealt * 0.08)));
              }

              // Passif Exécution (<20% PV)
              if (this.player.passives && this.player.passives.some(p => p.includes('Exécution')) && e.hp > 0 && e.hp < e.maxHp * 0.2 && !e.isBoss) {
                e.hp = 0;
                this.sound.playEnemyDeath();
                this.particles.addDeathBurst(e.x, e.y, '#ef4444', 30);
                this.damageNumbers.push(new DamageNumber(e.x, e.y - 20, 'EXÉCUTION !', '#ff0033', true));
              }

              // Knockback dans les murs (vérification isWalkable)
              const nx = e.x + Math.cos(angleToEnemy) * hb.knockback;
              const ny = e.y + Math.sin(angleToEnemy) * hb.knockback;
              if (this.dungeon.isWalkable(nx, e.y, e.radius)) e.x = nx;
              if (this.dungeon.isWalkable(e.x, ny, e.radius)) e.y = ny;

              if (hb.poison) {
                e.poisonTimer = 3.0;
                e.poisonDps = hb.poison;
              }
            }
          }
        }
      }
      this.player.activeMeleeHitbox = null;
    }

    // 6. Gestion des Ondes de Choc en expansion (Compétences Spéciales Chevalier / Mage)
    if (this.player.activeShockwave) {
      const sw = this.player.activeShockwave;
      this.shockwaves.push({
        x: sw.x,
        y: sw.y,
        currentRadius: 10,
        maxRadius: sw.radius,
        color: sw.color || (this.player.classDef.id === 'mage' ? '#7209b7' : '#00f0ff'),
        damage: sw.damage,
        freezeDuration: sw.freezeDuration,
        life: 0.35,
        maxLife: 0.35,
        hitSet: new Set()
      });
      this.screenShake = Math.max(this.screenShake, 12);
      this.player.activeShockwave = null;
    }

    // Mise à jour des ondes de choc
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life -= dt;
      const progress = 1 - Math.max(0, sw.life / sw.maxLife);
      sw.currentRadius = 10 + (sw.maxRadius - 10) * progress;

      for (const e of this.enemies) {
        if (!sw.hitSet.has(e)) {
          const dist = Math.hypot(e.x - sw.x, e.y - sw.y);
          if (dist <= sw.currentRadius + e.radius) {
            sw.hitSet.add(e);
            const dealt = e.takeDamage(sw.damage, this.sound, this.damageNumbers, true);
            this.runStats.damageDealt += dealt;
            if (sw.freezeDuration) {
              e.freezeTimer = sw.freezeDuration;
            }
            this.particles.addHitSpark(e.x, e.y, sw.color, 8);
          }
        }
      }

      if (sw.life <= 0) {
        this.shockwaves.splice(i, 1);
      }
    }

    // 7. Projectiles (Joueur et Ennemis)
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(dt, this.dungeon, this.player);

      // Traînée magique derrière les projectiles
      this.particles.addProjectileTrail(p.x, p.y, p.color);

      if (p.life <= 0) {
        this.projectiles.splice(i, 1);
        continue;
      }

      if (p.isPlayer) {
        // Collision projectile joueur vs destructibles
        if (this.dungeon && this.dungeon.destructibles) {
          for (const dest of this.dungeon.destructibles) {
            if (!dest.destroyed) {
              const dist = Math.hypot(dest.x - p.x, dest.y - p.y);
              if (dist < dest.radius + p.radius) {
                dest.hp -= p.damage;
                this.particles.addHitSpark(dest.x, dest.y, '#f59e0b', 6);
                if (dest.hp <= 0) {
                  this.destroyDestructible(dest);
                }
                p.pierce--;
                if (p.pierce <= 0) {
                  this.projectiles.splice(i, 1);
                  break;
                }
              }
            }
          }
        }
        if (p.pierce <= 0) continue;

        // Collision projectile joueur vs ennemis
        for (const e of this.enemies) {
          if (!p.hitList.has(e)) {
            const dist = Math.hypot(e.x - p.x, e.y - p.y);
            if (dist < e.radius + p.radius) {
              p.hitList.add(e);
              let pDamage = p.damage;
              if (this.player.passives && this.player.passives.some(pass => pass.includes("Tempête d'Âmes"))) {
                pDamage = Math.round(pDamage * (1 + Math.min(2.0, (this.roomKills || 0) * 0.25)));
              }
              const dealt = e.takeDamage(pDamage, this.sound, this.damageNumbers);
              this.runStats.damageDealt += dealt;

              // Juice & impacts V4
              this.hitFreezeTimer = 0.05;
              this.particles.addBloodSplat(e.x, e.y);
              e.squashTimer = 0.2;
              this.particles.addHitSpark(e.x, e.y, p.color, 8);

              // Effets de Runes & Gemmes
              if (this.player.fireBurn) {
                e.burnTimer = 3.0;
                e.burnDps = this.player.fireBurn;
              }
              if (this.player.frostChance && Math.random() < this.player.frostChance) {
                e.freezeTimer = Math.max(e.freezeTimer, 2.0);
              }
              if (this.player.lifesteal) {
                this.player.heal(Math.max(1, Math.round(dealt * this.player.lifesteal)));
              }

              // Passif Vampirisme
              if (this.player.passives && this.player.passives.some(pass => pass.includes('Vampirisme'))) {
                this.player.heal(Math.max(1, Math.round(dealt * 0.08)));
              }

              // Passif Exécution
              if (this.player.passives && this.player.passives.some(pass => pass.includes('Exécution')) && e.hp > 0 && e.hp < e.maxHp * 0.2 && !e.isBoss) {
                e.hp = 0;
                this.sound.playEnemyDeath();
                this.particles.addDeathBurst(e.x, e.y, '#ef4444', 30);
                this.damageNumbers.push(new DamageNumber(e.x, e.y - 20, 'EXÉCUTION !', '#ff0033', true));
              }

              p.pierce--;
              if (p.pierce <= 0) {
                this.projectiles.splice(i, 1);
                break;
              }
            }
          }
        }
      } else {
        // Collision projectile ennemi vs joueur
        const dist = Math.hypot(this.player.x - p.x, this.player.y - p.y);
        if (dist < this.player.radius + p.radius) {
          this.player.takeDamage(p.damage, this.sound, this.damageNumbers, 'Tir Ténébreux');
          this.screenShake = Math.max(this.screenShake, 6);
          this.particles.addHitSpark(this.player.x, this.player.y, '#ef4444', 8);
          this.projectiles.splice(i, 1);
        }
      }
    }

    // 8. Ennemis
    let bossAlive = null;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(dt, this.player, this.dungeon, this.sound, this.projectiles, this.damageNumbers);

      // Bulles vertes sur les ennemis empoisonnés
      if (e.poisonTimer > 0 && Math.random() < 0.25) {
        this.particles.addPoisonBubble(e.x, e.y);
      }

      if (e.isBoss && e.hp > 0) {
        bossAlive = e;
      }

      if (e.hp <= 0) {
        this.runStats.kills++;
        this.roomKills = (this.roomKills || 0) + 1;
        const soulRate = 1 + (this.player.soulBonus || 0);
        const goldGained = Math.round(e.gold * this.tensionMultiplier);
        const soulsGained = Math.round(e.xpSouls * soulRate * this.tensionMultiplier);

        // Explosion de 40 particules à la mort d'un monstre
        this.particles.addDeathBurst(e.x, e.y, e.isBoss ? '#7209b7' : '#ef4444', 40);

        // Génération de butin au sol (avec multiplicateur de Tension)
        this.drops.push(new DropItem(e.x, e.y, { type: 'gold', value: goldGained }));
        this.drops.push(new DropItem(e.x + 6, e.y, { type: 'soul', value: soulsGained }));

        if (e.isBoss) {
          this.runStats.bosses++;
          // Le Boss lâche un objet Légendaire garanti + une Rune Rare/Épique et déverrouille l'escalier !
          this.drops.push(new DropItem(e.x - 10, e.y, { type: 'item', item: ItemGenerator.createItem(this.currentFloorNumber, 'legendary') }));
          this.drops.push(new DropItem(e.x + 12, e.y, { type: 'item', item: ItemGenerator.createRuneOrGem(this.currentFloorNumber) }));
          if (this.dungeon.stairs) {
            this.dungeon.stairs.locked = false;
          }
          this.damageNumbers.push(new DamageNumber(e.x, e.y - 30, 'ESCALIER DÉVERROUILLÉ !', '#fbbf24', true));
        } else if (Math.random() < 0.16) {
          // Butin de Rune ou Gemme
          this.drops.push(new DropItem(e.x + 10, e.y, { type: 'item', item: ItemGenerator.createRuneOrGem(this.currentFloorNumber) }));
        } else if (Math.random() < 0.22) {
          this.drops.push(new DropItem(e.x - 8, e.y, { type: 'item', item: ItemGenerator.createItem(this.currentFloorNumber) }));
        }

        this.enemies.splice(i, 1);
      }
    }

    // Gestion de la barre du Boss dans le HUD & Musique dynamique
    let bossIsVisible = false;
    if (bossAlive) {
      const btx = Math.floor(bossAlive.x / TILE_SIZE);
      const bty = Math.floor(bossAlive.y / TILE_SIZE);
      if (this.dungeon.visible[bty]?.[btx] === 1) {
        bossIsVisible = true;
      }
      if (this.dom.bossHud) {
        this.dom.bossHud.style.display = bossIsVisible ? 'flex' : 'none';
        if (bossIsVisible) {
          const pct = Math.max(0, (bossAlive.hp / bossAlive.maxHp) * 100);
          if (this.dom.bossBarFill) this.dom.bossBarFill.style.width = `${pct}%`;
          if (this.dom.bossName) this.dom.bossName.textContent = bossAlive.name;
        }
      }
    } else if (this.dom.bossHud) {
      this.dom.bossHud.style.display = 'none';
    }

    // Mise à jour du gestionnaire de particules
    this.particles.update(dt);

    // Musique dynamique
    if (bossIsVisible) {
      this.sound.playMusic('boss');
    } else if (this.enemies.some(e => e.hp > 0 && Math.hypot(e.x - this.player.x, e.y - this.player.y) < 260)) {
      this.sound.playMusic('combat');
    } else {
      this.sound.playMusic('explore');
    }

    // 9. Objets au sol et ramassage
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i];
      drop.update(dt, this.player);

      const dist = Math.hypot(this.player.x - drop.x, this.player.y - drop.y);
      if (dist < this.player.radius + drop.radius) {
        if (drop.data.type === 'gold') {
          this.inventory.gold += drop.data.value;
          this.runStats.goldEarned += drop.data.value;
          this.sound.playGoldPickup();
          this.damageNumbers.push(new DamageNumber(drop.x, drop.y, `+${drop.data.value} Or`, '#ffb703'));
          this.drops.splice(i, 1);
        } else if (drop.data.type === 'soul') {
          this.inventory.souls += drop.data.value;
          this.runStats.soulsEarned += drop.data.value;
          this.sound.playSoulPickup();
          this.damageNumbers.push(new DamageNumber(drop.x, drop.y, `+${drop.data.value} Âmes`, '#b5179e'));
          this.drops.splice(i, 1);
        } else if (drop.data.item) {
          const added = this.inventory.addItem(drop.data.item);
          if (added) {
            this.sound.playChestOpen();
            this.damageNumbers.push(new DamageNumber(drop.x, drop.y, `Trouvé : ${drop.data.item.name}`, '#38bdf8', true));
            this.drops.splice(i, 1);
          } else {
            // Sac plein : ne supprime pas l'objet
            if (!this.invFullCooldown || this.invFullCooldown <= 0) {
              this.invFullCooldown = 1.5;
              this.damageNumbers.push(new DamageNumber(this.player.x, this.player.y - 20, 'Inventaire Plein !', '#ef4444', true));
            }
          }
        }
      }
    }

    // 10. Pièges au sol
    for (const trap of this.dungeon.traps) {
      if (trap.activeCooldown > 0) trap.activeCooldown -= dt;
      const dist = Math.hypot(this.player.x - trap.x, this.player.y - trap.y);
      if (dist < 18 && trap.activeCooldown <= 0) {
        trap.activeCooldown = 1.2;
        this.sound.playTrap();
        this.player.takeDamage(trap.damage, this.sound, this.damageNumbers, 'Piège de Pointes');
      }
    }

    // 11. Interactions de l'environnement (E ou Entrée)
    let promptText = '';

    // Coffres
    for (const chest of this.dungeon.chests) {
      if (!chest.opened) {
        const dist = Math.hypot(this.player.x - chest.x, this.player.y - chest.y);
        if (dist < 36) {
          promptText = '[E] Ouvrir le Coffre';
          if (this.input.justPressed.interact) {
            chest.opened = true;
            this.sound.playChestOpen();
            this.drops.push(new DropItem(chest.x, chest.y, { type: 'item', item: chest.loot }));
            this.drops.push(new DropItem(chest.x + 8, chest.y, { type: 'gold', value: 20 + this.currentFloorNumber * 10 }));
          }
        }
      }
    }

    // Marchand PNJ
    if (this.dungeon.shopkeeper) {
      const sk = this.dungeon.shopkeeper;
      const dist = Math.hypot(this.player.x - sk.x, this.player.y - sk.y);
      if (dist < 42) {
        promptText = '[E] Parler au Marchand';
        if (this.input.justPressed.interact) {
          this.showScreen('SHOP');
        }
      }
    }

    // Autels Sacrificiels de Sang
    if (this.dungeon.altars) {
      for (const altar of this.dungeon.altars) {
        if (!altar.used) {
          const dist = Math.hypot(this.player.x - altar.x, this.player.y - altar.y);
          if (dist < 40) {
            promptText = '[E] Autel de Sang (Sacrifie 20 PV Max : +15 Dégâts & Butin Épique)';
            if (this.input.justPressed.interact) {
              if (this.player.maxHp > 25) {
                altar.used = true;
                this.player.maxHp -= 20;
                this.player.hp = Math.min(this.player.hp, this.player.maxHp);
                this.player.bonusDamage = (this.player.bonusDamage || 0) + 15;
                this.sound.playLevelUp();
                this.screenShake = Math.max(this.screenShake, 12);
                this.particles.addDeathBurst(altar.x, altar.y, '#dc2626', 45);
                this.damageNumbers.push(new DamageNumber(altar.x, altar.y - 25, 'PACT DE SANG : DÉGÂTS +15 !', '#ef4444', true));
                this.drops.push(new DropItem(altar.x, altar.y + 12, { type: 'item', item: ItemGenerator.createItem(this.currentFloorNumber, 'epic') }));
              } else {
                this.damageNumbers.push(new DamageNumber(this.player.x, this.player.y - 20, 'Vitalité trop faible !', '#ef4444', true));
              }
            }
          }
        }
      }
    }

    // Escaliers vers l'étage suivant ou Victoire
    if (this.dungeon.stairs) {
      const st = this.dungeon.stairs;
      const dist = Math.hypot(this.player.x - st.x, this.player.y - st.y);
      if (dist < 38) {
        if (st.locked) {
          promptText = 'Scellé par le Sceau du Souverain (Vainquez le Boss)';
        } else {
          promptText = this.currentFloorNumber >= 3 ? '[E] Purifier la Crypte (VICTOIRE)' : '[E] Descendre à l\'Étage Suivant';
          if (this.input.justPressed.interact) {
            if (this.currentFloorNumber >= 3) {
              this.endRun(true, 'Le Souverain Déchu a été terrassé ! La crypte est purifiée !');
            } else {
              this.nextFloor();
            }
          }
        }
      }
    }

    if (this.dom.interactionPrompt) {
      if (promptText) {
        this.dom.interactionPrompt.style.display = 'block';
        this.dom.interactionPrompt.textContent = promptText;
      } else {
        this.dom.interactionPrompt.style.display = 'none';
      }
    }

    // 12. Textes flottants
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const dn = this.damageNumbers[i];
      dn.update(dt);
      if (dn.life <= 0) this.damageNumbers.splice(i, 1);
    }

    // 13. Mise à jour de l'ATH
    this.updateHUD();

    // 14. Nettoyage des fronts montants d'input en fin de frame
    this.input.clearJustPressed();
  }

  updateHUD() {
    if (!this.player) return;

    if (this.dom.hpBarFill) {
      const pct = Math.max(0, (this.player.hp / this.player.maxHp) * 100);
      this.dom.hpBarFill.style.width = `${pct}%`;
    }
    if (this.dom.manaBarFill) {
      const pct = Math.max(0, (this.player.mana / this.player.maxMana) * 100);
      this.dom.manaBarFill.style.width = `${pct}%`;
    }
    if (this.dom.staminaBarFill) {
      const pct = Math.max(0, (this.player.stamina / this.player.maxStamina) * 100);
      this.dom.staminaBarFill.style.width = `${pct}%`;
    }

    // Affichage des valeurs exactes chiffrées (Style Gothique Royal V5)
    if (this.dom.hpText) this.dom.hpText.textContent = `${Math.round(this.player.hp)} / ${this.player.maxHp} PV`;
    if (this.dom.manaText) this.dom.manaText.textContent = `${Math.round(this.player.mana)} / ${this.player.maxMana} MANA`;
    if (this.dom.staminaText) this.dom.staminaText.textContent = `${Math.round(this.player.stamina)} / ${this.player.maxStamina} ENDU`;

    if (this.dom.hudGold) this.dom.hudGold.textContent = this.inventory.gold;
    if (this.dom.hudSouls) this.dom.hudSouls.textContent = this.inventory.souls;
    if (this.dom.hudPotionHp) this.dom.hudPotionHp.textContent = `x${this.inventory.potions.health}`;
    if (this.dom.hudPotionMana) this.dom.hudPotionMana.textContent = `x${this.inventory.potions.mana}`;

    // Jauge de Tension / Angoisse
    if (this.dom.tensionBarFill) {
      this.dom.tensionBarFill.style.width = `${this.tension}%`;
      if (this.tension < 40) {
        this.dom.tensionBarFill.style.background = 'linear-gradient(90deg, #1d4ed8, #38bdf8)';
      } else if (this.tension < 75) {
        this.dom.tensionBarFill.style.background = 'linear-gradient(90deg, #d97706, #fbbf24)';
      } else {
        this.dom.tensionBarFill.style.background = 'linear-gradient(90deg, #dc2626, #ef4444)';
      }
    }
    if (this.dom.tensionText) {
      this.dom.tensionText.textContent = `Tension : ${Math.round(this.tension)}% (Butin x${this.tensionMultiplier.toFixed(1)})`;
    }

    // Rendu de la Minimap
    this.renderMinimap();
  }

  renderMinimap() {
    if (!this.minimapCtx || !this.dungeon) return;
    const mctx = this.minimapCtx;
    const cw = this.dom.minimapCanvas.width;
    const ch = this.dom.minimapCanvas.height;
    mctx.clearRect(0, 0, cw, ch);

    const scale = cw / this.dungeon.width;

    // Rendu des salles et couloirs découverts
    for (let y = 0; y < this.dungeon.height; y++) {
      for (let x = 0; x < this.dungeon.width; x++) {
        if (this.dungeon.discovered[y][x]) {
          const tile = this.dungeon.grid[y][x];
          if (tile === TILE.FLOOR) mctx.fillStyle = '#334155';
          else if (tile === TILE.STAIRS) mctx.fillStyle = '#fbbf24';
          else if (tile === TILE.WALL) mctx.fillStyle = '#0f172a';
          else continue;
          mctx.fillRect(x * scale, y * scale, Math.ceil(scale), Math.ceil(scale));
        }
      }
    }

    // Joueur sur la minimap (point vert vif)
    const ptx = (this.player.x / TILE_SIZE) * scale;
    const pty = (this.player.y / TILE_SIZE) * scale;
    mctx.fillStyle = '#22c55e';
    mctx.beginPath();
    mctx.arc(ptx, pty, 3, 0, Math.PI * 2);
    mctx.fill();
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.state !== 'PLAYING' && this.state !== 'PAUSE' && this.state !== 'INVENTORY' && this.state !== 'SHOP') {
      return;
    }

    this.ctx.save();
    // V5 Moteur 2.5D : Échelle Zoomée x2.0 et caméra centrée
    this.ctx.scale(this.zoom, this.zoom);
    const shakeX = (Math.random() - 0.5) * this.screenShake;
    const shakeY = (Math.random() - 0.5) * this.screenShake;
    this.ctx.translate(Math.round(-this.camera.x + shakeX), Math.round(-this.camera.y + shakeY));

    // 1. Calcul du champ de vision caméra avec marge de sécurité pour la hauteur des murs
    const viewW = this.canvas.width / this.zoom;
    const viewH = this.canvas.height / this.zoom;
    const startTileX = Math.max(0, Math.floor(this.camera.x / TILE_SIZE) - 2);
    const endTileX = Math.min(this.dungeon.width - 1, Math.ceil((this.camera.x + viewW) / TILE_SIZE) + 2);
    const startTileY = Math.max(0, Math.floor(this.camera.y / TILE_SIZE) - 3);
    const endTileY = Math.min(this.dungeon.height - 1, Math.ceil((this.camera.y + viewH) / TILE_SIZE) + 3);

    // ==========================================
    // COUCHE 1 : SOL, GOUFFRES, PONTS & OMBRES 2.5D
    // ==========================================
    for (let ty = startTileY; ty <= endTileY; ty++) {
      for (let tx = startTileX; tx <= endTileX; tx++) {
        const isDiscovered = this.dungeon.discovered[ty][tx];
        const isVisible = this.dungeon.visible[ty][tx];
        if (!isDiscovered) continue;

        const tileType = this.dungeon.grid[ty][tx];
        const px = tx * TILE_SIZE;
        const py = ty * TILE_SIZE;

        if (tileType === TILE.FLOOR) {
          const variant = this.dungeon.floorVariants ? this.dungeon.floorVariants[ty]?.[tx] : 0;
          let sprite = (variant === 1) ? this.sprites['tile_floor_cracked.png'] : ((variant === 2) ? this.sprites['tile_floor_moss.png'] : this.sprites['tile_floor.png']);
          if (sprite && sprite.complete && sprite.naturalWidth > 0) {
            this.ctx.drawImage(sprite, px, py, TILE_SIZE, TILE_SIZE);
          } else {
            this.ctx.fillStyle = '#334155';
            this.ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          }
        } else if (tileType === TILE.STAIRS) {
          const sprite = this.sprites['tile_stairs.png'];
          if (sprite && sprite.complete && sprite.naturalWidth > 0) {
            this.ctx.drawImage(sprite, px, py, TILE_SIZE, TILE_SIZE);
          } else {
            this.ctx.fillStyle = '#fbbf24';
            this.ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          }
        } else if (tileType === TILE.CHASM) {
          const sprite = this.sprites['tile_chasm.png'];
          if (sprite && sprite.complete && sprite.naturalWidth > 0) {
            this.ctx.drawImage(sprite, px, py, TILE_SIZE, TILE_SIZE);
          } else {
            this.ctx.fillStyle = '#050308';
            this.ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          }

          // Paroi de falaise sombre de 14px de haut au bord supérieur des tuiles TILE.CHASM pour donner un vrai relief 3D aux gouffres
          const cliffGrad = this.ctx.createLinearGradient(px, py, px, py + 14);
          cliffGrad.addColorStop(0, '#1a1429');
          cliffGrad.addColorStop(0.4, '#0f0b1a');
          cliffGrad.addColorStop(1, '#050308');
          this.ctx.fillStyle = cliffGrad;
          this.ctx.fillRect(px, py, TILE_SIZE, 14);
          this.ctx.fillStyle = '#2d223d';
          this.ctx.fillRect(px, py, TILE_SIZE, 2);
        } else if (tileType === TILE.BRIDGE) {
          const sprite = this.sprites['tile_bridge.png'];
          if (sprite && sprite.complete && sprite.naturalWidth > 0) {
            this.ctx.drawImage(sprite, px, py, TILE_SIZE, TILE_SIZE);
          } else {
            this.ctx.fillStyle = '#64748b';
            this.ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          }
        }

        // Assombrissement zones explorées hors champ de vision
        if (!isVisible && tileType !== TILE.WALL) {
          this.ctx.fillStyle = 'rgba(10, 9, 16, 0.65)';
          this.ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    // Ombres portées 2.5D au sol (projetées au sud et à l'est de chaque mur)
    for (let ty = startTileY; ty <= endTileY; ty++) {
      for (let tx = startTileX; tx <= endTileX; tx++) {
        if (this.dungeon.discovered[ty]?.[tx] !== 1) continue;
        if (this.dungeon.grid[ty][tx] === TILE.WALL) {
          const px = tx * TILE_SIZE;
          const py = ty * TILE_SIZE;

          // Ombre portée au Sud si la case en dessous est praticable
          if (this.dungeon.grid[ty + 1]?.[tx] !== TILE.WALL) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            this.ctx.fillRect(px, py + 32, 32, 14);
          }
          // Ombre portée à l'Est si la case à droite est praticable
          if (this.dungeon.grid[ty]?.[tx + 1] !== TILE.WALL) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            this.ctx.fillRect(px + 32, py + 12, 14, 34);
          }
        }
      }
    }

    // Taches de sang persistantes au sol (gore pixel art sous les entités)
    this.particles.drawSplats(this.ctx);

    // Variété et Encombrement au sol (Bones, Chains, Puddles)
    if (this.dungeon.decors) {
      for (const dec of this.dungeon.decors) {
        const tx = Math.floor(dec.x / TILE_SIZE);
        const ty = Math.floor(dec.y / TILE_SIZE);
        if (this.dungeon.discovered[ty]?.[tx] === 1) {
          const sprName = `tile_decor_${dec.type}.png`;
          const sprite = this.sprites[sprName] || this.sprites['tile_decor_bones.png'];
          if (sprite && sprite.complete && sprite.naturalWidth > 0) {
            this.ctx.drawImage(sprite, dec.x - 16, dec.y - 16, 32, 32);
          }
        }
      }
    }

    // Pièges de pointes au sol
    for (const trap of this.dungeon.traps) {
      const tx = Math.floor(trap.x / TILE_SIZE);
      const ty = Math.floor(trap.y / TILE_SIZE);
      if (this.dungeon.discovered[ty]?.[tx] === 1) {
        const sprite = this.sprites['tile_spikes.png'];
        if (sprite && sprite.complete && sprite.naturalWidth > 0) {
          this.ctx.drawImage(sprite, trap.x - 16, trap.y - 16, 32, 32);
        }
      }
    }

    // ==========================================
    // COUCHE 2 : TRI DE PROFONDEUR 2.5D (Y-SORTING)
    // ==========================================
    const renderList = [];

    // 1. Murs 2.5D (Toit décalé py - 18 ET Façade verticale avant dans le Y-Sorting à y: (ty + 1) * TILE_SIZE)
    for (let ty = startTileY; ty <= endTileY; ty++) {
      for (let tx = startTileX; tx <= endTileX; tx++) {
        if (this.dungeon.discovered[ty]?.[tx] !== 1) continue;
        if (this.dungeon.grid[ty][tx] === TILE.WALL) {
          const px = tx * TILE_SIZE;
          const py = ty * TILE_SIZE;
          const isVis = (this.dungeon.visible[ty]?.[tx] === 1);
          const hasFrontFace = (this.dungeon.grid[ty + 1]?.[tx] !== TILE.WALL);

          renderList.push({
            y: (ty + 1) * TILE_SIZE,
            render: () => {
              // Sommet du mur décalé vers le haut (py - 18) créant le volume 3D
              const topH = 28;
              // Intérieur sombre de la dalle supérieure
              this.ctx.fillStyle = '#0f172a';
              this.ctx.fillRect(px, py - 18, 32, topH);
              // Flagstone texture sur le toit
              this.ctx.fillStyle = '#1e293b';
              this.ctx.fillRect(px + 2, py - 16, 13, topH - 4);
              this.ctx.fillRect(px + 17, py - 16, 13, topH - 4);
              // Corniche claire en pierre biseautée
              this.ctx.fillStyle = '#475569';
              this.ctx.fillRect(px, py - 18, 32, 2.5); // Bordure supérieure
              this.ctx.fillRect(px, py - 18, 2, topH);   // Bordure gauche
              this.ctx.fillRect(px + 30, py - 18, 2, topH); // Bordure droite

              if (!isVis) {
                this.ctx.fillStyle = 'rgba(10, 9, 16, 0.65)';
                this.ctx.fillRect(px, py - 18, 32, topH);
              }

              // Façade verticale avant uniquement si la tuile au sud n'est pas un mur
              if (hasFrontFace) {
                // Paroi verticale avant de 22px de haut en pierre sculptée
                this.ctx.fillStyle = '#1e293b';
                this.ctx.fillRect(px, py + 10, 32, 22);

                // Joints et briques en relief
                this.ctx.fillStyle = '#334155';
                this.ctx.fillRect(px, py + 16, 32, 1.5);
                this.ctx.fillRect(px + 9, py + 10, 1.5, 6);
                this.ctx.fillRect(px + 23, py + 10, 1.5, 6);
                this.ctx.fillRect(px + 16, py + 17, 1.5, 12);

                // Arche gothique gravée en relief
                this.ctx.strokeStyle = '#273549';
                this.ctx.lineWidth = 1.5;
                this.ctx.beginPath();
                this.ctx.moveTo(px + 4, py + 29);
                this.ctx.lineTo(px + 4, py + 18);
                this.ctx.quadraticCurveTo(px + 16, py + 11, px + 28, py + 18);
                this.ctx.lineTo(px + 28, py + 29);
                this.ctx.stroke();

                // Plinthe sombre au contact du sol
                this.ctx.fillStyle = '#090714';
                this.ctx.fillRect(px, py + 29, 32, 3);

                if (!isVis) {
                  this.ctx.fillStyle = 'rgba(10, 9, 16, 0.65)';
                  this.ctx.fillRect(px, py + 10, 32, 22);
                }
              }
            }
          });
        }
      }
    }

    // 2. Flambeaux (Torches murales)
    for (const torch of this.dungeon.torches) {
      const ttx = Math.floor(torch.x / TILE_SIZE);
      const tty = Math.floor(torch.y / TILE_SIZE);
      if (this.dungeon.discovered[tty]?.[ttx] === 1) {
        renderList.push({
          y: torch.y + 16,
          render: () => {
            const sprite = this.sprites['tile_torch.png'];
            if (sprite && sprite.complete && sprite.naturalWidth > 0) {
              this.ctx.drawImage(sprite, torch.x, torch.y, TILE_SIZE, TILE_SIZE);
            }
            if (this.dungeon.visible[tty]?.[ttx] === 1) {
              const pulse = 0.85 + Math.sin(Date.now() * 0.008 + torch.id) * 0.15;
              const grad = this.ctx.createRadialGradient(torch.x + 16, torch.y + 16, 4, torch.x + 16, torch.y + 16, 68 * pulse);
              grad.addColorStop(0, 'rgba(255, 200, 80, 0.35)');
              grad.addColorStop(0.4, 'rgba(245, 158, 11, 0.18)');
              grad.addColorStop(1, 'rgba(180, 83, 9, 0)');
              this.ctx.fillStyle = grad;
              this.ctx.beginPath();
              this.ctx.arc(torch.x + 16, torch.y + 16, 68 * pulse, 0, Math.PI * 2);
              this.ctx.fill();
            }
          }
        });
      }
    }

    // 3. Objets destructibles (Tonneaux & Urnes)
    if (this.dungeon.destructibles) {
      for (const dest of this.dungeon.destructibles) {
        if (!dest.destroyed) {
          const tx = Math.floor(dest.x / TILE_SIZE);
          const ty = Math.floor(dest.y / TILE_SIZE);
          if (this.dungeon.discovered[ty]?.[tx] === 1) {
            renderList.push({
              y: dest.y,
              render: () => {
                const sprName = `tile_${dest.type}.png`;
                const sprite = this.sprites[sprName] || this.sprites['tile_barrel.png'];
                if (sprite && sprite.complete && sprite.naturalWidth > 0) {
                  this.ctx.drawImage(sprite, dest.x - 16, dest.y - 16, 32, 32);
                }
              }
            });
          }
        }
      }
    }

    // 4. Coffres
    for (const chest of this.dungeon.chests) {
      const tx = Math.floor(chest.x / TILE_SIZE);
      const ty = Math.floor(chest.y / TILE_SIZE);
      if (this.dungeon.discovered[ty]?.[tx] === 1) {
        renderList.push({
          y: chest.y,
          render: () => {
            const sprite = chest.opened ? this.sprites['tile_chest_open.png'] : this.sprites['tile_chest_closed.png'];
            if (sprite && sprite.complete && sprite.naturalWidth > 0) {
              this.ctx.drawImage(sprite, chest.x - 16, chest.y - 16, 32, 32);
            }
          }
        });
      }
    }

    // 5. Autels Sacrificiels de Sang
    if (this.dungeon.altars) {
      for (const altar of this.dungeon.altars) {
        const tx = Math.floor(altar.x / TILE_SIZE);
        const ty = Math.floor(altar.y / TILE_SIZE);
        if (this.dungeon.discovered[ty]?.[tx] === 1) {
          renderList.push({
            y: altar.y,
            render: () => {
              const sprite = this.sprites['tile_altar.png'];
              if (sprite && sprite.complete && sprite.naturalWidth > 0) {
                this.ctx.drawImage(sprite, altar.x - 16, altar.y - 16, 32, 32);
              }
              if (!altar.used && this.dungeon.visible[ty]?.[tx] === 1) {
                const pulse = 0.8 + Math.sin(Date.now() * 0.006) * 0.2;
                const grad = this.ctx.createRadialGradient(altar.x, altar.y, 4, altar.x, altar.y, 36 * pulse);
                grad.addColorStop(0, 'rgba(239, 68, 68, 0.45)');
                grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
                this.ctx.fillStyle = grad;
                this.ctx.beginPath();
                this.ctx.arc(altar.x, altar.y, 36 * pulse, 0, Math.PI * 2);
                this.ctx.fill();
              }
            }
          });
        }
      }
    }

    // 6. Marchand PNJ
    if (this.dungeon.shopkeeper) {
      const sk = this.dungeon.shopkeeper;
      const tx = Math.floor(sk.x / TILE_SIZE);
      const ty = Math.floor(sk.y / TILE_SIZE);
      if (this.dungeon.discovered[ty]?.[tx] === 1) {
        renderList.push({
          y: sk.y,
          render: () => {
            const sprite = this.sprites['tile_shopkeeper.png'];
            if (sprite && sprite.complete && sprite.naturalWidth > 0) {
              this.ctx.drawImage(sprite, sk.x - 16, sk.y - 16, 32, 32);
            }
          }
        });
      }
    }

    // 7. Butin au sol (Drops)
    for (const drop of this.drops) {
      const dtx = Math.floor(drop.x / TILE_SIZE);
      const dty = Math.floor(drop.y / TILE_SIZE);
      if (this.dungeon.visible[dty]?.[dtx] === 1 || this.dungeon.discovered[dty]?.[dtx] === 1) {
        renderList.push({
          y: drop.y,
          render: () => drop.draw(this.ctx, this.sprites)
        });
      }
    }

    // 8. Ennemis
    for (const e of this.enemies) {
      const etx = Math.floor(e.x / TILE_SIZE);
      const ety = Math.floor(e.y / TILE_SIZE);
      if (this.dungeon.visible[ety]?.[etx] === 1) {
        renderList.push({
          y: e.y,
          render: () => e.draw(this.ctx, this.sprites)
        });
      }
    }

    // 9. Joueur
    if (this.player) {
      renderList.push({
        y: this.player.y,
        render: () => this.player.draw(this.ctx, this.sprites)
      });
    }

    // EXÉCUTION DU TRI DE PROFONDEUR 2.5D (Y-SORTING)
    renderList.sort((a, b) => a.y - b.y);
    for (let i = 0; i < renderList.length; i++) {
      renderList[i].render();
    }

    // ==========================================
    // COUCHE 3 : EFFETS SUSPENDUS & PROJECTILES
    // ==========================================
    // Projectiles
    for (const p of this.projectiles) {
      if (p.isPlayer) {
        p.draw(this.ctx);
      } else {
        const ptx = Math.floor(p.x / TILE_SIZE);
        const pty = Math.floor(p.y / TILE_SIZE);
        if (this.dungeon.visible[pty]?.[ptx] === 1) {
          p.draw(this.ctx);
        }
      }
    }

    // Ondes de choc actives (anneaux lumineux)
    for (const sw of this.shockwaves) {
      const alpha = Math.max(0, sw.life / sw.maxLife);
      this.ctx.save();
      this.ctx.strokeStyle = sw.color;
      this.ctx.lineWidth = 3.5;
      this.ctx.globalAlpha = alpha;
      this.ctx.shadowBlur = 14;
      this.ctx.shadowColor = sw.color;
      this.ctx.beginPath();
      this.ctx.arc(sw.x, sw.y, sw.currentRadius, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
    }

    // Système de particules
    this.particles.draw(this.ctx);

    // Textes flottants
    for (const dn of this.damageNumbers) {
      dn.draw(this.ctx);
    }

    this.ctx.restore();

    // ==========================================
    // COUCHE 4 : ÉCLAIRAGE VIGNETTE & CRT ARCADE
    // ==========================================
    const screenPx = this.player ? (this.player.x - this.camera.x) * this.zoom : this.canvas.width / 2;
    const screenPy = this.player ? (this.player.y - this.camera.y) * this.zoom : this.canvas.height / 2;
    const darkVignette = this.ctx.createRadialGradient(
      screenPx, screenPy, 140,
      screenPx, screenPy, Math.max(this.canvas.width, this.canvas.height) * 0.76
    );
    darkVignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    darkVignette.addColorStop(0.55, 'rgba(6, 5, 12, 0.40)');
    darkVignette.addColorStop(1, 'rgba(2, 2, 6, 0.88)');
    this.ctx.fillStyle = darkVignette;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Scanlines rétro discrètes (effet moniteur arcade)
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
    for (let y = 0; y < this.canvas.height; y += 3) {
      this.ctx.fillRect(0, y, this.canvas.width, 1);
    }
  }

  // --- RENDU DES INTERFACES UI ---
  renderInventoryUI() {
    const bagGrid = document.getElementById('inventoryBagGrid');
    const equipWeapon = document.getElementById('slotEquipWeapon');
    const equipArmor = document.getElementById('slotEquipArmor');
    const equipRing = document.getElementById('slotEquipRing');

    if (!bagGrid) return;
    bagGrid.innerHTML = '';

    // 16 emplacements de sac
    for (let i = 0; i < this.inventory.maxBagSlots; i++) {
      const item = this.inventory.bag[i];
      const slotDiv = document.createElement('div');
      slotDiv.className = 'inv-slot';

      if (item) {
        const rarity = ITEM_RARITIES[item.rarity] || ITEM_RARITIES.common;
        slotDiv.style.borderColor = rarity.borderColor;
        slotDiv.style.boxShadow = rarity.glow;

        const img = document.createElement('img');
        img.src = item.sprite || 'assets/sprites/item_sword.png';
        slotDiv.appendChild(img);

        // Affichage des châsses / sockets sur l'icône de l'objet
        if (item.maxSockets > 0) {
          const socketWrap = document.createElement('div');
          socketWrap.className = 'socket-indicators-wrap';
          for (let s = 0; s < item.maxSockets; s++) {
            const socketDot = document.createElement('span');
            socketDot.className = 'socket-dot';
            if (item.sockets && item.sockets[s]) {
              socketDot.classList.add('filled');
              socketDot.style.background = item.sockets[s].color || '#fbbf24';
            }
            socketWrap.appendChild(socketDot);
          }
          slotDiv.appendChild(socketWrap);
        }

        let tooltip = `${item.name} (${rarity.name})\n${item.desc}`;
        if (item.maxSockets > 0) {
          tooltip += `\nChâsses : ${item.sockets.length}/${item.maxSockets}`;
          if (item.sockets.length > 0) {
            tooltip += '\n' + item.sockets.map(s => ` • ${s.name}`).join('\n');
          }
        }

        if (item.type === 'rune' || item.type === 'gem') {
          slotDiv.title = `[RUNE/GEMME] ${tooltip}\nCliquez pour sertir dans votre Arme ou Armure équipée`;
          slotDiv.addEventListener('click', () => {
            // Tenter de sertir dans l'arme d'abord, puis dans l'armure
            const weapon = this.inventory.equipped.weapon;
            const armor = this.inventory.equipped.armor;
            let targetEquip = null;

            if (weapon && (weapon.sockets?.length || 0) < (weapon.maxSockets || 0)) {
              targetEquip = weapon;
            } else if (armor && (armor.sockets?.length || 0) < (armor.maxSockets || 0)) {
              targetEquip = armor;
            }

            if (targetEquip) {
              const runeItem = this.inventory.bag.splice(i, 1)[0];
              const success = this.inventory.socketRune(targetEquip, runeItem);
              if (success) {
                this.sound.playLevelUp();
                this.player.applyEquipmentStats(this.inventory.getNetEquipmentStats());
                if (this.damageNumbers && this.player) {
                  this.damageNumbers.push(new DamageNumber(this.player.x, this.player.y - 20, `${runeItem.name} Sertie !`, runeItem.color || '#fbbf24', true));
                }
              } else {
                this.inventory.bag.splice(i, 0, runeItem);
              }
            } else {
              if (this.damageNumbers && this.player) {
                this.damageNumbers.push(new DamageNumber(this.player.x, this.player.y - 20, 'Aucune châsse libre disponible !', '#ef4444', true));
              }
            }
            this.renderInventoryUI();
          });
        } else {
          slotDiv.title = `${tooltip}\nCliquez pour équiper`;
          slotDiv.addEventListener('click', () => {
            this.inventory.equip(i);
            this.player.applyEquipmentStats(this.inventory.getNetEquipmentStats());
            this.renderInventoryUI();
          });
        }
      }
      bagGrid.appendChild(slotDiv);
    }

    // Emplacements d'équipement
    this.renderEquipSlot(equipWeapon, 'weapon', 'item_sword.png');
    this.renderEquipSlot(equipArmor, 'armor', 'item_armor_heavy.png');
    this.renderEquipSlot(equipRing, 'ring', 'item_ring.png');
  }

  renderEquipSlot(container, slotType, defaultIcon) {
    if (!container) return;
    container.innerHTML = '';
    const item = this.inventory.equipped[slotType];

    if (item) {
      const rarity = ITEM_RARITIES[item.rarity] || ITEM_RARITIES.common;
      container.style.borderColor = rarity.borderColor;
      container.style.boxShadow = rarity.glow;

      const img = document.createElement('img');
      img.src = item.sprite || `assets/sprites/${defaultIcon}`;
      container.appendChild(img);

      // Châsses de l'équipement
      if (item.maxSockets > 0) {
        const socketWrap = document.createElement('div');
        socketWrap.className = 'socket-indicators-wrap';
        for (let s = 0; s < item.maxSockets; s++) {
          const socketDot = document.createElement('span');
          socketDot.className = 'socket-dot';
          if (item.sockets && item.sockets[s]) {
            socketDot.classList.add('filled');
            socketDot.style.background = item.sockets[s].color || '#fbbf24';
          }
          socketWrap.appendChild(socketDot);
        }
        container.appendChild(socketWrap);
      }

      let tooltip = `[ÉQUIPÉ] ${item.name} (${rarity.name})\n${item.desc}`;
      if (item.maxSockets > 0) {
        tooltip += `\nChâsses : ${item.sockets.length}/${item.maxSockets}`;
        if (item.sockets.length > 0) {
          tooltip += '\n' + item.sockets.map(s => ` • ${s.name}`).join('\n');
        }
      }
      tooltip += '\nCliquez pour déséquiper';
      container.title = tooltip;

      container.onclick = () => {
        this.inventory.unequip(slotType);
        this.player.applyEquipmentStats(this.inventory.getNetEquipmentStats());
        this.renderInventoryUI();
      };
    } else {
      container.style.borderColor = '#475569';
      container.style.boxShadow = 'none';
      container.innerHTML = `<span class="empty-slot-label">${slotType.toUpperCase()}</span>`;
      container.onclick = null;
    }
  }

  renderShopUI() {
    const container = document.getElementById('shopItemsContainer');
    const goldDisplay = document.getElementById('shopGoldCurrent');
    if (goldDisplay) goldDisplay.textContent = this.inventory.gold;
    if (!container || !this.dungeon.shopkeeper) return;

    container.innerHTML = '';
    const items = this.dungeon.shopkeeper.items;

    items.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'shop-item-card';
      const rarity = ITEM_RARITIES[item.rarity] || ITEM_RARITIES.common;
      card.style.borderColor = rarity.borderColor;

      card.innerHTML = `
        <img src="${item.sprite}" class="shop-item-img" />
        <div class="shop-item-info">
          <div class="shop-item-name" style="color: ${rarity.color}">${item.name}</div>
          <div class="shop-item-desc">${item.desc}</div>
        </div>
        <button class="btn-buy" ${this.inventory.gold < item.price ? 'disabled' : ''}>
          ${item.price} Or
        </button>
      `;

      const btnBuy = card.querySelector('.btn-buy');
      btnBuy.addEventListener('click', () => {
        if (this.inventory.gold >= item.price) {
          const added = this.inventory.addItem(item);
          if (added) {
            this.inventory.gold -= item.price;
            this.sound.playGoldPickup();
            items.splice(idx, 1);
            this.renderShopUI();
          } else {
            if (this.player) {
              this.damageNumbers.push(new DamageNumber(this.player.x, this.player.y - 20, 'Inventaire Plein !', '#ef4444', true));
            }
          }
        }
      });

      container.appendChild(card);
    });
  }

  renderSanctuaryUI() {
    const soulsDisplay = document.getElementById('sanctuarySoulsCount');
    if (soulsDisplay) soulsDisplay.textContent = this.storage.data.totalSouls;

    const list = document.getElementById('sanctuaryUpgradesList');
    if (!list) return;
    list.innerHTML = '';

    for (const [id, config] of Object.entries(META_UPGRADES_CONFIG)) {
      const lvl = this.storage.data.upgrades[id] || 0;
      const cost = this.storage.getUpgradeCost(id);
      const isMax = (lvl >= config.maxLevel);

      const row = document.createElement('div');
      row.className = 'sanctuary-row';
      row.innerHTML = `
        <div class="sanctuary-info">
          <div class="sanctuary-name">${config.name} <span class="badge-level">Niv. ${lvl}/${config.maxLevel}</span></div>
          <div class="sanctuary-desc">${config.desc}</div>
        </div>
        <button class="btn-upgrade-meta" ${isMax || this.storage.data.totalSouls < cost ? 'disabled' : ''}>
          ${isMax ? 'MAX' : `${cost} Âmes`}
        </button>
      `;

      const btn = row.querySelector('.btn-upgrade-meta');
      if (!isMax) {
        btn.addEventListener('click', () => {
          if (this.storage.buyUpgrade(id)) {
            this.sound.playLevelUp();
            this.renderSanctuaryUI();
          }
        });
      }

      list.appendChild(row);
    }
  }
}

// Initialisation globale
window.addEventListener('DOMContentLoaded', () => {
  window.gameInstance = new Game();
});
