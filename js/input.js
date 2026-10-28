/**
 * CRYPT OF THE SOVEREIGN - HYBRID INPUT CONTROLLER
 * Prise en charge native Clavier / Souris & Manette (Gamepad API standard Xbox/PlayStation)
 * Prise en charge IPC Electron pour Plein Écran (F11) et Quitter le jeu.
 */

class InputManager {
  constructor(canvas) {
    this.canvas = canvas;

    // Vecteur de mouvement
    this.moveX = 0;
    this.moveY = 0;

    // Visée
    this.aimX = 0;
    this.aimY = 0;
    this.aimAngle = 0;
    this.isMouse = true;

    // Actions (état actuel et front montant)
    this.actions = {
      attack: false,
      skill: false,
      roll: false,
      interact: false,
      inventory: false,
      potion1: false,
      potion2: false,
      pause: false,
      fullscreen: false
    };

    this.justPressed = {
      attack: false,
      skill: false,
      roll: false,
      interact: false,
      inventory: false,
      potion1: false,
      potion2: false,
      pause: false,
      fullscreen: false
    };

    // Suivi interne des touches clavier
    this.keys = new Set();
    this.prevActions = { ...this.actions };

    // Détection manette
    this.gamepadIndex = null;
    this.hasGamepad = false;

    this.bindEvents();
  }

  bindEvents() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);

      if (e.code === 'KeyE' || e.code === 'Enter') this.triggerJustPressed('interact');
      if (e.code === 'KeyI' || e.code === 'Tab') {
        this.triggerJustPressed('inventory');
        e.preventDefault();
      }
      if (e.code === 'Digit1') this.triggerJustPressed('potion1');
      if (e.code === 'Digit2') this.triggerJustPressed('potion2');
      if (e.code === 'Space' || e.code === 'ShiftLeft') this.triggerJustPressed('roll');
      if (e.code === 'KeyJ') this.triggerJustPressed('attack');
      if (e.code === 'KeyK') this.triggerJustPressed('skill');
      if (e.code === 'Escape') this.triggerJustPressed('pause');
      if (e.code === 'F11') {
        this.toggleFullscreen();
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    // Souris
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.aimX = (e.clientX - rect.left) * scaleX;
      this.aimY = (e.clientY - rect.top) * scaleY;
      this.isMouse = true;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.actions.attack = true;
        this.justPressed.attack = true;
      } else if (e.button === 2) {
        this.actions.skill = true;
        this.justPressed.skill = true;
      }
    });

    this.canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.actions.attack = false;
      if (e.button === 2) this.actions.skill = false;
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Événements Manette
    window.addEventListener('gamepadconnected', (e) => {
      console.log(`[GAMEPAD] Manette connectée: ${e.gamepad.id}`);
      this.gamepadIndex = e.gamepad.index;
      this.hasGamepad = true;
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      console.log(`[GAMEPAD] Manette déconnectée: ${e.gamepad.id}`);
      if (this.gamepadIndex === e.gamepad.index) {
        this.gamepadIndex = null;
        this.hasGamepad = false;
      }
    });
  }

  triggerJustPressed(actionName) {
    this.actions[actionName] = true;
    this.justPressed[actionName] = true;
  }

  update(playerScreenX, playerScreenY) {
    // 1. Réinitialiser les fronts montants
    for (const key in this.justPressed) {
      this.justPressed[key] = false;
    }

    // 2. Clavier
    let kx = 0;
    let ky = 0;
    if (this.keys.has('KeyW') || this.keys.has('KeyZ') || this.keys.has('ArrowUp')) ky -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) ky += 1;
    if (this.keys.has('KeyA') || this.keys.has('KeyQ') || this.keys.has('ArrowLeft')) kx -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) kx += 1;

    // Normalisation diagonale
    if (kx !== 0 && ky !== 0) {
      const inv = 1 / Math.SQRT2;
      kx *= inv;
      ky *= inv;
    }

    this.moveX = kx;
    this.moveY = ky;

    if (this.keys.has('KeyJ')) this.actions.attack = true;
    if (this.keys.has('KeyK')) this.actions.skill = true;
    if (this.keys.has('Space') || this.keys.has('ShiftLeft')) this.actions.roll = true;
    if (!this.keys.has('Space') && !this.keys.has('ShiftLeft')) this.actions.roll = false;

    // 3. Manette (Gamepad API)
    this.pollGamepad();

    // 4. Calcul de l'angle de visée
    if (this.isMouse && playerScreenX !== undefined && playerScreenY !== undefined) {
      this.aimAngle = Math.atan2(this.aimY - playerScreenY, this.aimX - playerScreenX);
    }
  }

  pollGamepad() {
    if (!navigator.getGamepads) return;
    const gamepads = navigator.getGamepads();
    const gp = gamepads[this.gamepadIndex] || gamepads[0];

    if (!gp || !gp.connected) {
      this.hasGamepad = false;
      return;
    }
    this.hasGamepad = true;

    // Stick Gauche (Mouvement)
    const deadzone = 0.22;
    let gx = gp.axes[0] || 0;
    let gy = gp.axes[1] || 0;

    // D-Pad override si stick inactif
    if (gp.buttons[14]?.pressed) gx = -1; // Gauche
    if (gp.buttons[15]?.pressed) gx = 1;  // Droite
    if (gp.buttons[12]?.pressed) gy = -1; // Haut
    if (gp.buttons[13]?.pressed) gy = 1;  // Bas

    if (Math.hypot(gx, gy) > deadzone) {
      this.moveX = gx;
      this.moveY = gy;
    }

    // Stick Droit (Visée manette)
    const rx = gp.axes[2] || 0;
    const ry = gp.axes[3] || 0;
    if (Math.hypot(rx, ry) > 0.3) {
      this.aimAngle = Math.atan2(ry, rx);
      this.isMouse = false;
    }

    // Boutons Manette standard
    const btnRoll = gp.buttons[0]?.pressed; // A / Croix
    const btnSkill = gp.buttons[1]?.pressed || gp.buttons[5]?.pressed; // B / Rond ou RB
    const btnAttack = gp.buttons[2]?.pressed || gp.buttons[7]?.pressed; // X / Carré ou RT
    const btnInteract = gp.buttons[3]?.pressed; // Y / Triangle
    const btnInventory = gp.buttons[8]?.pressed; // Select / Back
    const btnPause = gp.buttons[9]?.pressed; // Start

    if (btnAttack && !this.prevActions.attack) this.justPressed.attack = true;
    if (btnSkill && !this.prevActions.skill) this.justPressed.skill = true;
    if (btnRoll && !this.prevActions.roll) this.justPressed.roll = true;
    if (btnInteract && !this.prevActions.interact) this.justPressed.interact = true;
    if (btnInventory && !this.prevActions.inventory) this.justPressed.inventory = true;
    if (btnPause && !this.prevActions.pause) this.justPressed.pause = true;

    this.actions.attack = this.actions.attack || btnAttack;
    this.actions.skill = this.actions.skill || btnSkill;
    this.actions.roll = this.actions.roll || btnRoll;
    this.actions.interact = this.actions.interact || btnInteract;

    this.prevActions = { ...this.actions };
  }

  toggleFullscreen() {
    if (window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.send('game-toggle-fullscreen');
        return;
      } catch (e) {}
    }

    // Fallback navigateur standard HTML5 Fullscreen API
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  quitGame() {
    if (window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.send('game-quit');
        return;
      } catch (e) {}
    }
    // Fallback navigateur
    window.close();
  }
}

window.InputManager = InputManager;
