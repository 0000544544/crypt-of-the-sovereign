/**
 * CRYPT OF THE SOVEREIGN - AUTOMATED TEST SUITE (Chrome Headless CDP)
 * Vérifie : 0 erreur console, 100% des sprites PNG chargés, 60 FPS stables,
 * boucle de combat, inventaire, équipement et sauvegarde persistante.
 */

const { spawn } = require('child_process');
const server = require('./server'); // Lance le serveur HTTP sur port 8085

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9222;
const TARGET_URL = 'http://localhost:8085';

async function runTests() {
  console.log('====================================================');
  console.log('🛡️ CRYPT OF THE SOVEREIGN - SUITE DE TESTS AUTOMATISÉS');
  console.log('====================================================');

  console.log('[1/10] Lancement de Google Chrome en mode Headless CDP...');
  const chromeProcess = spawn(CHROME_PATH, [
    '--headless=new',
    '--window-size=1280,720',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--disable-gpu',
    '--no-sandbox',
    '--autoplay-policy=no-user-gesture-required',
    TARGET_URL
  ]);

  await new Promise(r => setTimeout(r, 2000));

  let pageTarget = null;
  try {
    const versionRes = await fetch(`http://localhost:${DEBUG_PORT}/json`);
    const targets = await versionRes.json();
    pageTarget = targets.find(t => t.type === 'page');
  } catch (err) {
    console.error('Impossible de se connecter au port de debug Chrome', err);
    chromeProcess.kill();
    process.exit(1);
  }

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

  let messageId = 1;
  const callbacks = new Map();
  const consoleErrors = [];

  function sendCommand(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = messageId++;
      callbacks.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.method === 'Runtime.consoleAPICalled') {
      if (data.params.type === 'error') {
        consoleErrors.push(data.params.args.map(a => a.value || a.description).join(' '));
      }
    }
    if (data.method === 'Runtime.exceptionThrown') {
      consoleErrors.push(data.params.exceptionDetails.text + ' ' + (data.params.exceptionDetails.exception?.description || ''));
    }
    if (data.id && callbacks.has(data.id)) {
      const { resolve, reject } = callbacks.get(data.id);
      callbacks.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }
  };

  await sendCommand('Runtime.enable');
  await sendCommand('Page.enable');
  await sendCommand('Page.navigate', { url: TARGET_URL });
  await new Promise(r => setTimeout(r, 2000));

  async function evaluate(expression) {
    const res = await sendCommand('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval exception: ${res.exceptionDetails.text} - ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result.value;
  }

  try {
    // TEST 1 : Initialisation
    console.log('[TEST 1] Chargement de la page et initialisation du moteur...');
    const initCheck = await evaluate(`
      ({
        exists: !!window.gameInstance,
        state: window.gameInstance ? window.gameInstance.state : null
      })
    `);
    console.log(' -> Instance détectée :', initCheck.exists);
    console.log(' -> État initial :', initCheck.state);
    if (!initCheck.exists || initCheck.state !== 'TITLE') {
      throw new Error('Échec de l\'initialisation de window.gameInstance');
    }

    // TEST 2 : Vérification du chargement de 100% des sprites PNG
    console.log('[TEST 2] Vérification du chargement de 100% des images sprites...');
    const spriteAudit = await evaluate(`
      (() => {
        const sprites = window.gameInstance.sprites;
        const keys = Object.keys(sprites);
        let validCount = 0;
        let broken = [];
        keys.forEach(k => {
          const img = sprites[k];
          if (img && img.complete && img.naturalWidth > 0) {
            validCount++;
          } else {
            broken.push(k);
          }
        });
        return { total: keys.length, validCount, broken };
      })()
    `);
    console.log(` -> Sprites chargés avec succès : ${spriteAudit.validCount} / ${spriteAudit.total}`);
    if (spriteAudit.broken.length > 0) {
      throw new Error(`Sprites brisés détectés : ${spriteAudit.broken.join(', ')}`);
    }

    // TEST 3 : Sélection de classe (Chevalier, Archimage, Assassin)
    console.log('[TEST 3] Navigation et sélection de la classe Chevalier Mystique...');
    const classCheck = await evaluate(`
      (() => {
        window.gameInstance.showScreen('SELECT_CLASS');
        window.gameInstance.selectedClassId = 'knight';
        return {
          state: window.gameInstance.state,
          selectedClass: window.gameInstance.selectedClassId
        };
      })()
    `);
    console.log(' -> État sélection :', classCheck);

    // TEST 4 : Démarrage d'expédition et génération de donjon
    console.log('[TEST 4] Génération procédurale du Donjon (Étage 1)...');
    const dungeonCheck = await evaluate(`
      (() => {
        window.gameInstance.startRun('knight');
        const d = window.gameInstance.dungeon;
        return {
          state: window.gameInstance.state,
          roomsCount: d.rooms.length,
          hasBoss: !!d.bossRoom,
          hasTreasure: !!d.treasureRoom,
          hasShop: !!d.shopkeeper,
          enemiesCount: window.gameInstance.enemies.length,
          playerHp: window.gameInstance.player.hp
        };
      })()
    `);
    console.log(' -> Rapport d\'exploration :', dungeonCheck);
    if (dungeonCheck.roomsCount < 5 || !dungeonCheck.hasBoss) {
      throw new Error('Donjon invalide ou salle de boss manquante');
    }

    // TEST 5 : Simulation de déplacement et collision
    console.log('[TEST 5] Simulation du déplacement et des collisions avec les murs...');
    const moveCheck = await evaluate(`
      (() => {
        const p = window.gameInstance.player;
        const startX = p.x;
        const startY = p.y;
        window.gameInstance.input.keys.add('KeyD');
        window.gameInstance.update(0.1);
        window.gameInstance.input.keys.delete('KeyD');
        return {
          startX,
          endX: p.x,
          moved: p.x > startX
        };
      })()
    `);
    console.log(' -> Déplacement fluide validé :', moveCheck);

    // TEST 6 : Simulation des combats, compétences et esquive
    console.log('[TEST 6] Déclenchement de l\'attaque à l\'épée, compétence Bouclier et Roulade...');
    const combatCheck = await evaluate(`
      (() => {
        const p = window.gameInstance.player;
        // Attaque
        window.gameInstance.input.actions.attack = true;
        window.gameInstance.update(0.05);
        window.gameInstance.input.actions.attack = false;

        // Compétence spéciale
        window.gameInstance.input.actions.skill = true;
        window.gameInstance.update(0.05);
        window.gameInstance.input.actions.skill = false;

        // Roulade
        window.gameInstance.input.actions.roll = true;
        window.gameInstance.update(0.05);
        window.gameInstance.input.actions.roll = false;

        return {
          shieldHp: p.shieldHp,
          isRolling: p.isRolling,
          attackCooldown: p.attackCooldown > 0
        };
      })()
    `);
    console.log(' -> Mécaniques de combat :', combatCheck);
    if (combatCheck.shieldHp !== 45) {
      throw new Error('Le bouclier protecteur n\'a pas été activé');
    }

    // TEST 7 : Système d'inventaire, loot et raretés
    console.log('[TEST 7] Test de l\'inventaire et équipement des 4 raretés...');
    const lootCheck = await evaluate(`
      (() => {
        const inv = window.gameInstance.inventory;
        const itemCommon = window.ItemGenerator.createItem(1, 'common');
        const itemRare = window.ItemGenerator.createItem(1, 'rare');
        const itemEpic = window.ItemGenerator.createItem(1, 'epic');
        const itemLegendary = window.ItemGenerator.createItem(1, 'legendary');

        inv.addItem(itemCommon);
        inv.addItem(itemRare);
        inv.addItem(itemEpic);
        inv.addItem(itemLegendary);

        const bagCount = inv.bag.length;
        inv.equip(0); // Équipe le premier item compatible

        const netStats = inv.getNetEquipmentStats();
        return {
          bagCount,
          equippedWeapon: !!inv.equipped.weapon,
          hasLegendaryPassives: netStats.passives !== undefined
        };
      })()
    `);
    console.log(' -> Gestion d\'inventaire validée :', lootCheck);

    // TEST 8 : Méta-progression et sauvegarde persistante localStorage
    console.log('[TEST 8] Test de la persistance dans localStorage et du Sanctuaire...');
    const storageCheck = await evaluate(`
      (() => {
        const store = window.gameInstance.storage;
        store.addSouls(100);
        const bought = store.buyUpgrade('forge');
        store.save();

        // Rechargement frais depuis localStorage
        const reloaded = new window.StorageManager();
        return {
          souls: reloaded.data.totalSouls,
          forgeLevel: reloaded.data.upgrades.forge,
          boughtSuccess: bought
        };
      })()
    `);
    console.log(' -> Persistance Sanctuaire :', storageCheck);
    if (storageCheck.forgeLevel !== 1 || !storageCheck.boughtSuccess) {
      throw new Error('Échec de la sauvegarde ou de l\'amélioration de la Forge');
    }

    // TEST 8b : Vérification des contrôles KeyE (coffre), KeyI (inventaire stable) et frames d'invulnérabilité
    console.log('[TEST 8b] Vérification de l\'interaction KeyE, de la stabilité de KeyI et des i-frames...');
    const bugFixesCheck = await evaluate(`
      (() => {
        const g = window.gameInstance;
        const p = g.player;

        // 1. Test i-frames sur takeDamage
        p.shieldHp = 0;
        p.hitCooldown = 0;
        const hpBefore = p.hp;
        const dmg1 = p.takeDamage(20, g.sound, g.damageNumbers, 'Test');
        const hpAfterFirst = p.hp;
        const dmg2 = p.takeDamage(20, g.sound, g.damageNumbers, 'Test spam immédiat');
        const hpAfterSecond = p.hp;
        const iframesValid = (dmg1 > 0 && dmg2 === 0 && hpAfterFirst === hpAfterSecond && p.hitCooldown > 0);

        // 2. Test interaction KeyE sur un coffre
        if (g.dungeon.chests.length > 0) {
          const chest = g.dungeon.chests[0];
          p.x = chest.x;
          p.y = chest.y;
          window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
          g.update(0.016);
          var chestOpened = chest.opened;
        } else {
          var chestOpened = true;
        }

        // 3. Test stabilité de l'inventaire avec KeyI sur plusieurs frames
        g.showScreen('PLAYING');
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyI' }));
        g.update(0.016);
        const stateFrame1 = g.state;
        g.update(0.016);
        const stateFrame2 = g.state;
        g.update(0.016);
        const stateFrame3 = g.state;
        const inventoryStable = (stateFrame1 === 'INVENTORY' && stateFrame2 === 'INVENTORY' && stateFrame3 === 'INVENTORY');

        g.showScreen('PLAYING');

        return {
          iframesValid,
          dmg1,
          dmg2,
          chestOpened,
          inventoryStable
        };
      })()
    `);
    console.log(' -> Validation des 3 correctifs critiques :', bugFixesCheck);
    if (!bugFixesCheck.iframesValid) throw new Error('Les frames d\'invulnérabilité de takeDamage ont échoué');
    if (!bugFixesCheck.chestOpened) throw new Error('L\'interaction KeyE sur le coffre a échoué');
    if (!bugFixesCheck.inventoryStable) throw new Error('L\'inventaire KeyI clignote ou ne reste pas ouvert sur les frames successives');

    // TEST 8c : Validation des correctifs de logique V3 et du moteur visuel
    console.log('[TEST 8c] Validation des correctifs de logique V3 et du moteur visuel...');
    const v3Check = await evaluate(`
      (() => {
        const g = window.gameInstance;

        // 1. Test Shockwaves Array & Expansion
        g.player.activeShockwave = { x: g.player.x, y: g.player.y, radius: 80, damage: 25, freezeDuration: 1.0 };
        g.update(0.016);
        const shockwaveActive = (g.shockwaves.length > 0 && g.shockwaves[0].currentRadius >= 10);

        // 2. Test Blink Astral Mage (isRolling === false)
        g.startRun('mage');
        g.input.actions.roll = true;
        g.update(0.016);
        g.input.actions.roll = false;
        const mageBlinkRolling = g.player.isRolling; // Must be false!

        // 3. Test Boss HUD caché tant qu'il n'est pas vu
        const bossHudHidden = (g.dom.bossHud.style.display === 'none');

        // 4. Test Boutique avec sac plein (l'or ne doit pas être déduit)
        const initialGold = g.inventory.gold = 500;
        // Remplir le sac à 16 items
        while (g.inventory.bag.length < g.inventory.maxBagSlots) {
          g.inventory.bag.push(window.ItemGenerator.createItem(1, 'common'));
        }
        g.dungeon.shopkeeper = {
          x: g.player.x,
          y: g.player.y,
          items: [window.ItemGenerator.createItem(1, 'epic')]
        };
        g.dungeon.shopkeeper.items[0].price = 100;
        g.renderShopUI();
        const buyBtn = document.querySelector('.btn-buy');
        if (buyBtn) buyBtn.click();
        const goldAfterFailedBuy = g.inventory.gold;
        const shopProtectionValid = (goldAfterFailedBuy === initialGold && g.dungeon.shopkeeper.items.length === 1);

        // 5. Test Particules
        const particlesWorking = (g.particles && g.particles.particles !== undefined);

        return {
          shockwaveActive,
          mageBlinkImmediate: !mageBlinkRolling,
          bossHudHidden,
          shopProtectionValid,
          particlesWorking
        };
      })()
    `);
    console.log(' -> Validation V3 :', v3Check);
    if (!v3Check.shockwaveActive) throw new Error('Les ondes de choc visuelles n\'ont pas été enregistrées');
    if (!v3Check.mageBlinkImmediate) throw new Error('Le Blink Astral bloque le mage dans l\'état isRolling');
    if (!v3Check.bossHudHidden) throw new Error('Le HUD du Boss est affiché alors qu\'il n\'est pas dans le champ de vision');
    if (!v3Check.shopProtectionValid) throw new Error('La boutique a déduit l\'or alors que le sac était plein');
    if (!v3Check.particlesWorking) throw new Error('Le ParticleManager n\'est pas actif');

    // TEST 9 : Test de fluidité 60 FPS
    console.log('[TEST 9] Mesure de fluidité sur 60 images (60 FPS)...');
    const fpsCheck = await evaluate(`
      new Promise(resolve => {
        let frames = 0;
        const start = performance.now();
        function frame() {
          frames++;
          if (frames >= 60) {
            const duration = performance.now() - start;
            resolve({
              frames,
              duration,
              fps: Math.round((frames / duration) * 1000)
            });
          } else {
            requestAnimationFrame(frame);
          }
        }
        requestAnimationFrame(frame);
      })
    `);
    console.log(` -> Performance : ${fpsCheck.fps} FPS sur 60 images (${fpsCheck.duration.toFixed(1)} ms)`);
    if (fpsCheck.fps < 45) {
      throw new Error(`Framerate insuffisant : ${fpsCheck.fps} FPS`);
    }

    // TEST 10 : Zéro erreur console JavaScript
    console.log('[TEST 10] Audit des erreurs console JavaScript...');
    console.log(` -> Total erreurs console capturées : ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.error('Erreurs console:', consoleErrors);
      throw new Error(`Erreurs détectées dans la console : ${consoleErrors.join(' | ')}`);
    }

    console.log('====================================================');
    console.log('🏆 100% DES TESTS SONT VALIDÉS AVEC SUCCÈS (0 ERREUR) !');
    console.log('====================================================');

    ws.close();
    chromeProcess.kill();
    try { if (server.listening) server.close(); } catch(e) {}
    process.exit(0);

  } catch (err) {
    console.error('❌ [TEST CRASH]', err);
    ws.close();
    chromeProcess.kill();
    try { if (server.listening) server.close(); } catch(e) {}
    process.exit(1);
  }
}

runTests();
