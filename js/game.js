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
    this.enemies = [];
    this.projectiles = [];
    this.drops = [];
    this.damageNumbers = [];

    // Caméra
    this.camera = { x: 0, y: 0 };
    this.screenShake = 0;

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
      hudFloor: document.getElementById('hudFloor'),
      hudGold: document.getElementById('hudGold'),
      hudSouls: document.getElementById('hudSouls'),
      hudPotionHp: document.getElementById('hudPotionHp'),
      hudPotionMana: document.getElementById('hudPotionMana'),
      interactionPrompt: document.getElementById('interactionPrompt'),
      minimapCanvas: document.getElementById('minimapCanvas')
    };

    this.minimapCtx = this.dom.minimapCanvas ? this.dom.minimapCanvas.getContext('2d') : null;

    this.lastTime = performance.now();
    this.init();
  }

  async init() {
    this.bindDomEvents();
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
      'tile_floor.png', 'tile_wall.png', 'tile_door_closed.png', 'tile_door_open.png', 'tile_stairs.png',
      'tile_torch.png', 'tile_chest_closed.png', 'tile_chest_open.png', 'tile_spikes.png', 'tile_shopkeeper.png',
      'item_sword.png', 'item_staff.png', 'item_dagger.png', 'item_armor_heavy.png', 'item_armor_robe.png',
      'item_armor_leather.png', 'item_ring.png', 'item_potion_health.png', 'item_potion_mana.png',
      'item_coin.png', 'item_soul_gem.png', 'icon.png'
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
    if (this.player) {
      this.player.aegisUsedThisFloor = false;
    }
    this.dungeon = new DungeonFloor(floorNumber, 60, 60);

    // Positionner le joueur dans la salle de départ
    this.player.x = this.dungeon.startRoom.cx * TILE_SIZE + TILE_SIZE / 2;
    this.player.y = this.dungeon.startRoom.cy * TILE_SIZE + TILE_SIZE / 2;

    this.enemies = [];
    this.projectiles = [];
    this.drops = [];
    this.damageNumbers = [];

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

    // 1. Mise à jour de l'Input avec position du joueur sur l'écran
    const screenPx = this.player.x - this.camera.x;
    const screenPy = this.player.y - this.camera.y;
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

    // Vérification de la mort du joueur
    if (this.player.hp <= 0) {
      this.endRun(false, 'Vos blessures vous ont été fatales.');
      this.input.clearJustPressed();
      return;
    }

    // 3. Mise à jour de la Caméra fluide
    const targetCamX = this.player.x - this.canvas.width / 2;
    const targetCamY = this.player.y - this.canvas.height / 2;
    this.camera.x += (targetCamX - this.camera.x) * 8 * dt;
    this.camera.y += (targetCamY - this.camera.y) * 8 * dt;

    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 25);
    }

    // 4. Brouillard de guerre et visibilité
    this.dungeon.updateFog(this.player.x, this.player.y, 280);

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

              // Passif Vampirisme (8% de soins)
              if (this.player.passives && this.player.passives.some(p => p.includes('Vampirisme'))) {
                this.player.heal(Math.max(1, Math.round(totalDealt * 0.08)));
              }

              // Passif Exécution (<20% PV)
              if (this.player.passives && this.player.passives.some(p => p.includes('Exécution')) && e.hp > 0 && e.hp < e.maxHp * 0.2 && !e.isBoss) {
                e.hp = 0;
                this.sound.playEnemyDeath();
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

    // 6. Gestion des Ondes de Choc (Compétences Spéciales Chevalier / Mage)
    if (this.player.activeShockwave) {
      const sw = this.player.activeShockwave;
      for (const e of this.enemies) {
        if (!sw.hitSet.has(e)) {
          const dist = Math.hypot(e.x - sw.x, e.y - sw.y);
          if (dist <= sw.radius + e.radius) {
            sw.hitSet.add(e);
            const dealt = e.takeDamage(sw.damage, this.sound, this.damageNumbers, true);
            this.runStats.damageDealt += dealt;
            if (sw.freezeDuration) {
              e.freezeTimer = sw.freezeDuration;
            }
          }
        }
      }
      this.player.activeShockwave = null;
    }

    // 7. Projectiles (Joueur et Ennemis)
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(dt, this.dungeon, this.player);

      if (p.life <= 0) {
        this.projectiles.splice(i, 1);
        continue;
      }

      if (p.isPlayer) {
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

              // Passif Vampirisme
              if (this.player.passives && this.player.passives.some(pass => pass.includes('Vampirisme'))) {
                this.player.heal(Math.max(1, Math.round(dealt * 0.08)));
              }

              // Passif Exécution
              if (this.player.passives && this.player.passives.some(pass => pass.includes('Exécution')) && e.hp > 0 && e.hp < e.maxHp * 0.2 && !e.isBoss) {
                e.hp = 0;
                this.sound.playEnemyDeath();
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
          this.projectiles.splice(i, 1);
        }
      }
    }

    // 8. Ennemis
    let bossAlive = null;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(dt, this.player, this.dungeon, this.sound, this.projectiles, this.damageNumbers);

      if (e.isBoss && e.hp > 0) {
        bossAlive = e;
      }

      if (e.hp <= 0) {
        this.runStats.kills++;
        this.roomKills = (this.roomKills || 0) + 1;
        const soulRate = 1 + (this.storage.getSanctuaryBonuses().soulBonus || 0);
        const soulsGained = Math.round(e.xpSouls * soulRate);

        // Génération de butin au sol (l'or et les âmes sont crédités au ramassage)
        this.drops.push(new DropItem(e.x, e.y, { type: 'gold', value: e.gold }));
        this.drops.push(new DropItem(e.x + 6, e.y, { type: 'soul', value: soulsGained }));

        if (e.isBoss) {
          this.runStats.bosses++;
          // Le Boss lâche un objet Légendaire garanti et déverrouille l'escalier !
          this.drops.push(new DropItem(e.x - 10, e.y, { type: 'item', item: ItemGenerator.createItem(this.currentFloorNumber, 'legendary') }));
          if (this.dungeon.stairs) {
            this.dungeon.stairs.locked = false;
          }
          this.damageNumbers.push(new DamageNumber(e.x, e.y - 30, 'ESCALIER DÉVERROUILLÉ !', '#fbbf24', true));
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
        this.dom.bossHud.style.display = 'flex';
        const pct = Math.max(0, (bossAlive.hp / bossAlive.maxHp) * 100);
        if (this.dom.bossBarFill) this.dom.bossBarFill.style.width = `${pct}%`;
        if (this.dom.bossName) this.dom.bossName.textContent = bossAlive.name;
      }
    } else if (this.dom.bossHud) {
      this.dom.bossHud.style.display = 'none';
    }

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

    if (this.dom.hudGold) this.dom.hudGold.textContent = this.inventory.gold;
    if (this.dom.hudSouls) this.dom.hudSouls.textContent = this.inventory.souls;
    if (this.dom.hudPotionHp) this.dom.hudPotionHp.textContent = `x${this.inventory.potions.health}`;
    if (this.dom.hudPotionMana) this.dom.hudPotionMana.textContent = `x${this.inventory.potions.mana}`;

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
    // Application de la caméra et du shake
    const shakeX = (Math.random() - 0.5) * this.screenShake;
    const shakeY = (Math.random() - 0.5) * this.screenShake;
    this.ctx.translate(Math.round(-this.camera.x + shakeX), Math.round(-this.camera.y + shakeY));

    // 1. Rendu des Tuiles du Donjon dans le champ de vision caméra
    const startTileX = Math.max(0, Math.floor(this.camera.x / TILE_SIZE));
    const endTileX = Math.min(this.dungeon.width - 1, Math.ceil((this.camera.x + this.canvas.width) / TILE_SIZE));
    const startTileY = Math.max(0, Math.floor(this.camera.y / TILE_SIZE));
    const endTileY = Math.min(this.dungeon.height - 1, Math.ceil((this.camera.y + this.canvas.height) / TILE_SIZE));

    for (let ty = startTileY; ty <= endTileY; ty++) {
      for (let tx = startTileX; tx <= endTileX; tx++) {
        const isDiscovered = this.dungeon.discovered[ty][tx];
        const isVisible = this.dungeon.visible[ty][tx];
        if (!isDiscovered) continue;

        const tileType = this.dungeon.grid[ty][tx];
        const px = tx * TILE_SIZE;
        const py = ty * TILE_SIZE;

        let sprite = null;
        if (tileType === TILE.FLOOR) sprite = this.sprites['tile_floor.png'];
        else if (tileType === TILE.WALL) sprite = this.sprites['tile_wall.png'];
        else if (tileType === TILE.STAIRS) sprite = this.sprites['tile_stairs.png'];

        if (sprite && sprite.complete && sprite.naturalWidth > 0) {
          this.ctx.drawImage(sprite, px, py, TILE_SIZE, TILE_SIZE);
        } else {
          // Fallback
          this.ctx.fillStyle = tileType === TILE.WALL ? '#1e293b' : '#334155';
          this.ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        }

        // Assombrir les zones explorées mais non visibles actuellement
        if (!isVisible) {
          this.ctx.fillStyle = 'rgba(10, 9, 16, 0.65)';
          this.ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    // 2. Pièges, Coffres, Flambeaux et Marchand (uniquement si tuile découverte)
    for (const torch of this.dungeon.torches) {
      const ttx = Math.floor(torch.x / TILE_SIZE);
      const tty = Math.floor(torch.y / TILE_SIZE);
      if (this.dungeon.discovered[tty]?.[ttx] === 1) {
        const sprite = this.sprites['tile_torch.png'];
        if (sprite && sprite.complete && sprite.naturalWidth > 0) {
          this.ctx.drawImage(sprite, torch.x, torch.y, TILE_SIZE, TILE_SIZE);
        }
        if (this.dungeon.visible[tty]?.[ttx] === 1) {
          const pulse = 0.85 + Math.sin(Date.now() * 0.008 + torch.id) * 0.15;
          const grad = this.ctx.createRadialGradient(torch.x + 16, torch.y + 16, 4, torch.x + 16, torch.y + 16, 54 * pulse);
          grad.addColorStop(0, 'rgba(255, 183, 3, 0.28)');
          grad.addColorStop(1, 'rgba(255, 183, 3, 0)');
          this.ctx.fillStyle = grad;
          this.ctx.beginPath();
          this.ctx.arc(torch.x + 16, torch.y + 16, 54 * pulse, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    }

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

    for (const chest of this.dungeon.chests) {
      const tx = Math.floor(chest.x / TILE_SIZE);
      const ty = Math.floor(chest.y / TILE_SIZE);
      if (this.dungeon.discovered[ty]?.[tx] === 1) {
        const sprite = chest.opened ? this.sprites['tile_chest_open.png'] : this.sprites['tile_chest_closed.png'];
        if (sprite && sprite.complete && sprite.naturalWidth > 0) {
          this.ctx.drawImage(sprite, chest.x - 16, chest.y - 16, 32, 32);
        }
      }
    }

    if (this.dungeon.shopkeeper) {
      const sk = this.dungeon.shopkeeper;
      const tx = Math.floor(sk.x / TILE_SIZE);
      const ty = Math.floor(sk.y / TILE_SIZE);
      if (this.dungeon.discovered[ty]?.[tx] === 1) {
        const sprite = this.sprites['tile_shopkeeper.png'];
        if (sprite && sprite.complete && sprite.naturalWidth > 0) {
          this.ctx.drawImage(sprite, sk.x - 16, sk.y - 16, 32, 32);
        }
      }
    }

    // 3. Objets au sol (visibles ou découverts)
    for (const drop of this.drops) {
      const dtx = Math.floor(drop.x / TILE_SIZE);
      const dty = Math.floor(drop.y / TILE_SIZE);
      if (this.dungeon.visible[dty]?.[dtx] === 1 || this.dungeon.discovered[dty]?.[dtx] === 1) {
        drop.draw(this.ctx, this.sprites);
      }
    }

    // 4. Ennemis (uniquement si tuile visible)
    for (const e of this.enemies) {
      const etx = Math.floor(e.x / TILE_SIZE);
      const ety = Math.floor(e.y / TILE_SIZE);
      if (this.dungeon.visible[ety]?.[etx] === 1) {
        e.draw(this.ctx, this.sprites);
      }
    }

    // 5. Joueur (toujours visible)
    if (this.player) {
      this.player.draw(this.ctx, this.sprites);
    }

    // 6. Projectiles (projectiles ennemis uniquement si tuile visible)
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

    // 7. Textes flottants
    for (const dn of this.damageNumbers) {
      dn.draw(this.ctx);
    }

    this.ctx.restore();
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

        slotDiv.title = `${item.name} (${rarity.name})\n${item.desc}`;
        slotDiv.addEventListener('click', () => {
          this.inventory.equip(i);
          this.player.applyEquipmentStats(this.inventory.getNetEquipmentStats());
          this.renderInventoryUI();
        });
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

      container.title = `[ÉQUIPÉ] ${item.name}\n${item.desc}\nCliquez pour déséquiper`;
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
          this.inventory.gold -= item.price;
          this.inventory.addItem(item);
          this.sound.playGoldPickup();
          items.splice(idx, 1);
          this.renderShopUI();
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
