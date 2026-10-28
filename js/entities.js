/**
 * CRYPT OF THE SOVEREIGN - ENTITIES & COMBAT SYSTEM
 * Joueur, Bestiaire IA (Swarmer, Archer, Nécromancien, Tank, Boss Souverain Déchu),
 * Projectiles magiques, Objets au sol et Textes flottants de combat.
 */

class DamageNumber {
  constructor(x, y, text, color = '#f8fafc', isCrit = false) {
    this.x = x + (Math.random() * 16 - 8);
    this.y = y;
    this.text = text;
    this.color = color;
    this.isCrit = isCrit;
    this.life = 0.85;
    this.maxLife = 0.85;
    this.vy = -45;
  }

  update(dt) {
    this.life -= dt;
    this.y += this.vy * dt;
    this.vy *= 0.94;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    const alpha = Math.min(1, this.life / 0.3);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.shadowBlur = this.isCrit ? 10 : 4;
    ctx.shadowColor = this.color;
    ctx.font = this.isCrit ? 'bold 15px monospace' : 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

class Projectile {
  constructor(options) {
    this.x = options.x;
    this.y = options.y;
    this.vx = options.vx;
    this.vy = options.vy;
    this.radius = options.radius || 4;
    this.damage = options.damage || 20;
    this.isPlayer = options.isPlayer !== false;
    this.color = options.color || (this.isPlayer ? '#00f0ff' : '#ff0055');
    this.life = options.life || 1.8;
    this.maxLife = this.life;
    this.pierce = options.pierce || 1;
    this.homing = options.homing || 0;
    this.hitList = new Set();
  }

  update(dt, dungeon, target = null) {
    this.life -= dt;

    if (this.homing > 0 && target && target.hp > 0) {
      const angleToTarget = Math.atan2(target.y - this.y, target.x - this.x);
      const currentAngle = Math.atan2(this.vy, this.vx);
      let diff = angleToTarget - currentAngle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      const speed = Math.hypot(this.vx, this.vy);
      const newAngle = currentAngle + diff * Math.min(1, this.homing * dt);
      this.vx = Math.cos(newAngle) * speed;
      this.vy = Math.sin(newAngle) * speed;
    }

    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;

    // Collision avec les murs du donjon
    const tx = Math.floor(this.x / TILE_SIZE);
    const ty = Math.floor(this.y / TILE_SIZE);
    if (dungeon.grid[ty]?.[tx] === TILE.WALL || dungeon.grid[ty]?.[tx] === TILE.VOID) {
      this.life = 0;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Noyau éclatant
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class DropItem {
  constructor(x, y, data) {
    this.x = x;
    this.y = y;
    this.data = data; // { type: 'gold'|'soul'|'item', value: number, item: object }
    this.radius = 8;
    this.collected = false;
    this.bounce = Math.random() * Math.PI * 2;
  }

  update(dt, player) {
    this.bounce += dt * 4;
    const dist = Math.hypot(player.x - this.x, player.y - this.y);
    // Magnétisme à courte portée
    if (dist < 75) {
      const angle = Math.atan2(player.y - this.y, player.x - this.x);
      const speed = 240 * dt;
      this.x += Math.cos(angle) * speed;
      this.y += Math.sin(angle) * speed;
    }
  }

  draw(ctx, spriteSheet) {
    ctx.save();
    const offsetY = Math.sin(this.bounce) * 3;
    let sprite = null;

    if (this.data.type === 'gold') sprite = spriteSheet['item_coin.png'];
    else if (this.data.type === 'soul') sprite = spriteSheet['item_soul_gem.png'];
    else if (this.data.item) {
      const iconKey = this.data.item.sprite ? this.data.item.sprite.replace('assets/sprites/', '') : 'item_sword.png';
      sprite = spriteSheet[iconKey];
    }

    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.drawImage(sprite, this.x - 8, this.y - 8 + offsetY, 16, 16);
    } else {
      // Fallback géométrique
      ctx.fillStyle = this.data.type === 'gold' ? '#ffb703' : (this.data.type === 'soul' ? '#b5179e' : '#38bdf8');
      ctx.beginPath();
      ctx.arc(this.x, this.y + offsetY, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

class Player {
  constructor(classDef, metaBonuses) {
    this.classDef = classDef;
    this.meta = metaBonuses;

    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.radius = 11;
    this.facingLeft = false;

    // Statistiques effectives
    this.maxHp = classDef.stats.maxHp + (metaBonuses.bonusHp || 0);
    this.hp = this.maxHp;
    this.maxMana = classDef.stats.maxMana;
    this.mana = this.maxMana;
    this.maxStamina = classDef.stats.maxStamina;
    this.stamina = this.maxStamina;
    this.speed = classDef.stats.speed;
    this.armor = classDef.stats.armor;
    this.critChance = classDef.stats.critChance;
    this.critMultiplier = classDef.stats.critMultiplier;
    this.manaRegen = classDef.stats.manaRegen;

    // Timers & Équipement
    this.attackCooldown = 0;
    this.skillCooldown = 0;
    this.rollCooldown = 0;
    this.isRolling = false;
    this.rollTimer = 0;
    this.rollDirX = 0;
    this.rollDirY = 0;

    // Statuts magiques
    this.shieldHp = 0;
    this.shieldTimer = 0;
    this.invisibleTimer = 0;
    this.nextCritGuaranteed = false;

    this.hitCooldown = 0;
    this.swingAnim = 0;
    this.swingAngle = 0;
  }

  applyEquipmentStats(equipmentStats) {
    this.effectiveDamageBonus = equipmentStats.damage || 0;
    this.effectiveArmor = Math.min(0.75, this.armor + (equipmentStats.armor || 0));
    this.effectiveCrit = this.critChance + (equipmentStats.crit || 0);
    this.effectiveSpeed = this.speed + (equipmentStats.speed || 0);
    this.effectiveManaRegen = this.manaRegen + (equipmentStats.manaRegen || 0);
    this.passives = equipmentStats.passives || [];

    // Recalcule maxHp, maxMana et soulBonus
    const prevMaxHp = this.maxHp;
    const bonusHp = (this.meta.bonusHp || 0) + (equipmentStats.hp || 0);
    this.maxHp = this.classDef.stats.maxHp + bonusHp;
    if (this.hp > this.maxHp) this.hp = this.maxHp;
    else if (this.maxHp > prevMaxHp) this.hp += (this.maxHp - prevMaxHp);

    const bonusMana = equipmentStats.mana || 0;
    this.maxMana = this.classDef.stats.maxMana + bonusMana;
    if (this.mana > this.maxMana) this.mana = this.maxMana;

    this.soulBonus = (this.meta.soulBonus || 0) + (equipmentStats.soulBonus || 0);
  }

  update(dt, input, dungeon, soundEngine, projectiles, damageNumbers) {
    // 1. Régénération passive Mana & Stamina
    this.mana = Math.min(this.maxMana, this.mana + (this.effectiveManaRegen || this.manaRegen) * dt);
    if (!this.isRolling) {
      this.stamina = Math.min(this.maxStamina, this.stamina + 45 * dt);
    }

    // Cooldowns
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.skillCooldown > 0) this.skillCooldown -= dt;
    if (this.rollCooldown > 0) this.rollCooldown -= dt;
    if (this.hitCooldown > 0) this.hitCooldown -= dt;
    if (this.swingAnim > 0) this.swingAnim -= dt * 4;

    // Bouclier & Invisibilité
    if (this.shieldTimer > 0) {
      this.shieldTimer -= dt;
      if (this.shieldTimer <= 0) this.shieldHp = 0;
    }
    if (this.invisibleTimer > 0) {
      this.invisibleTimer -= dt;
    }

    // 2. Gestion de la Roulade / Esquive
    if (this.isRolling) {
      this.rollTimer -= dt;
      const rollSpeed = this.speed * (this.classDef.roll.speedMult || 2.0) * 60 * dt;
      const nextX = this.x + this.rollDirX * rollSpeed;
      const nextY = this.y + this.rollDirY * rollSpeed;

      if (dungeon.isWalkable(nextX, this.y, this.radius)) this.x = nextX;
      if (dungeon.isWalkable(this.x, nextY, this.radius)) this.y = nextY;

      if (this.rollTimer <= 0) {
        this.isRolling = false;
      }
      return; // Pendant la roulade, le joueur ne peut pas attaquer
    }

    // Déclenchement de la roulade
    if (input.actions.roll && this.rollCooldown <= 0 && this.stamina >= this.classDef.roll.staminaCost) {
      this.stamina -= this.classDef.roll.staminaCost;
      this.rollCooldown = this.classDef.roll.cooldown;
      this.isRolling = true;
      this.rollTimer = this.classDef.roll.duration;
      soundEngine.playRoll();

      // Direction de roulade basée sur le mouvement actuel ou la visée
      const rdx = (input.moveX !== 0 || input.moveY !== 0) ? input.moveX : Math.cos(input.aimAngle);
      const rdy = (input.moveX !== 0 || input.moveY !== 0) ? input.moveY : Math.sin(input.aimAngle);

      if (this.classDef.id === 'mage') {
        // Vraie téléportation Blink Astral avec onde de choc à l'arrivée
        const blinkDist = 140;
        let finalX = this.x;
        let finalY = this.y;
        for (let step = 10; step <= blinkDist; step += 10) {
          const testX = this.x + rdx * step;
          const testY = this.y + rdy * step;
          if (dungeon.isWalkable(testX, testY, this.radius)) {
            finalX = testX;
            finalY = testY;
          } else {
            break;
          }
        }
        this.x = finalX;
        this.y = finalY;
        soundEngine.playMagicCast();
        this.activeShockwave = {
          x: this.x,
          y: this.y,
          radius: 75,
          damage: 30 * (this.meta.damageMultiplier || 1),
          freezeDuration: 1.0,
          hitSet: new Set()
        };
        damageNumbers.push(new DamageNumber(this.x, this.y - 20, 'BLINK ASTRAL !', '#4cc9f0', true));
      } else {
        this.rollDirX = rdx;
        this.rollDirY = rdy;
      }
      return;
    }

    // 3. Déplacement standard
    const currentSpeed = (this.effectiveSpeed || this.speed) * (this.invisibleTimer > 0 ? 1.5 : 1.0);
    const mx = input.moveX * currentSpeed * 60 * dt;
    const my = input.moveY * currentSpeed * 60 * dt;

    if (dungeon.isWalkable(this.x + mx, this.y, this.radius)) this.x += mx;
    if (dungeon.isWalkable(this.x, this.y + my, this.radius)) this.y += my;

    if (input.aimAngle > Math.PI * 0.5 || input.aimAngle < -Math.PI * 0.5) {
      this.facingLeft = true;
    } else {
      this.facingLeft = false;
    }

    // 4. Attaque Principale
    if (input.actions.attack && this.attackCooldown <= 0) {
      this.performPrimaryAttack(input.aimAngle, soundEngine, projectiles, dungeon);
    }

    // 5. Compétence Spéciale
    if (input.actions.skill && this.skillCooldown <= 0 && this.mana >= this.classDef.specialSkill.manaCost) {
      this.performSpecialSkill(input.aimAngle, soundEngine, projectiles, damageNumbers);
    }
  }

  performPrimaryAttack(angle, soundEngine, projectiles, dungeon) {
    this.attackCooldown = this.classDef.primaryAttack.cooldown;
    this.swingAnim = 1.0;
    this.swingAngle = angle;

    const baseDmg = (this.classDef.primaryAttack.damage + (this.effectiveDamageBonus || 0)) * (this.meta.damageMultiplier || 1);
    let isCrit = false;
    let critMult = this.critMultiplier || 2.0;

    if (this.invisibleTimer > 0 || this.nextCritGuaranteed) {
      isCrit = true;
      critMult = 3.0; // Multiplicateur critique de 300% à la sortie d'invisibilité
      this.invisibleTimer = 0;
      this.nextCritGuaranteed = false;
    } else {
      isCrit = (Math.random() < (this.effectiveCrit || this.critChance));
    }
    const finalDmg = isCrit ? Math.round(baseDmg * critMult) : Math.round(baseDmg);

    if (this.classDef.id === 'knight') {
      soundEngine.playSwordSlash();
      // L'attaque au corps-à-corps sera résolue lors des collisions avec les ennemis
      this.activeMeleeHitbox = {
        angle,
        arc: this.classDef.primaryAttack.arc,
        range: this.classDef.primaryAttack.range,
        damage: finalDmg,
        hits: 1,
        isCrit,
        knockback: this.classDef.primaryAttack.knockback,
        hitSet: new Set()
      };
    } else if (this.classDef.id === 'mage') {
      soundEngine.playMagicCast();
      projectiles.push(new Projectile({
        x: this.x + Math.cos(angle) * 16,
        y: this.y + Math.sin(angle) * 16,
        vx: Math.cos(angle) * (this.classDef.primaryAttack.projectileSpeed || 8),
        vy: Math.sin(angle) * (this.classDef.primaryAttack.projectileSpeed || 8),
        damage: finalDmg,
        isPlayer: true,
        pierce: this.classDef.primaryAttack.pierce || 1,
        color: '#4cc9f0',
        radius: 6
      }));
    } else if (this.classDef.id === 'rogue') {
      soundEngine.playDaggerSlash();
      this.activeMeleeHitbox = {
        angle,
        arc: this.classDef.primaryAttack.arc,
        range: this.classDef.primaryAttack.range,
        damage: finalDmg,
        hits: 2, // Double dague : frappe 2 fois
        isCrit,
        knockback: 10,
        poison: 10,
        hitSet: new Set()
      };
    }
  }

  performSpecialSkill(angle, soundEngine, projectiles, damageNumbers) {
    this.mana -= this.classDef.specialSkill.manaCost;
    this.skillCooldown = this.classDef.specialSkill.cooldown;

    if (this.classDef.id === 'knight') {
      // Bouclier Sanctuaire (Onde de choc étourdissante + barrière)
      soundEngine.playLevelUp();
      this.shieldHp = this.classDef.specialSkill.shieldValue;
      this.shieldTimer = this.classDef.specialSkill.shieldDuration;
      damageNumbers.push(new DamageNumber(this.x, this.y - 20, '+45 BOUCLIER', '#00f0ff', true));
      this.activeShockwave = {
        x: this.x,
        y: this.y,
        radius: this.classDef.specialSkill.radius,
        damage: this.classDef.specialSkill.damage * (this.meta.damageMultiplier || 1),
        freezeDuration: 1.5, // Étourdissement 1.5s
        hitSet: new Set()
      };
    } else if (this.classDef.id === 'mage') {
      // Nova de Givre
      soundEngine.playMagicCast();
      damageNumbers.push(new DamageNumber(this.x, this.y - 20, 'NOVA DE GIVRE !', '#7209b7', true));
      this.activeShockwave = {
        x: this.x,
        y: this.y,
        radius: this.classDef.specialSkill.radius,
        damage: this.classDef.specialSkill.damage * (this.meta.damageMultiplier || 1),
        freezeDuration: this.classDef.specialSkill.freezeDuration,
        hitSet: new Set()
      };
    } else if (this.classDef.id === 'rogue') {
      // Voile d'Ombre (Invisibilité + Critique Garanti 300%)
      soundEngine.playDaggerSlash();
      this.invisibleTimer = this.classDef.specialSkill.duration;
      this.nextCritGuaranteed = true;
      damageNumbers.push(new DamageNumber(this.x, this.y - 20, 'VOILE D\'OMBRE !', '#06d6a0', true));
    }
  }

  takeDamage(amount, soundEngine, damageNumbers, attackerName = '') {
    if (this.hitCooldown > 0 || this.isRolling || this.hp <= 0) return 0;

    // Absorption par le bouclier
    let actualDamage = amount;
    if (this.shieldHp > 0) {
      if (this.shieldHp >= actualDamage) {
        this.shieldHp -= actualDamage;
        damageNumbers.push(new DamageNumber(this.x, this.y - 15, `-${actualDamage} (BOUCLIER)`, '#00f0ff'));
        soundEngine.playHit();
        this.hitCooldown = 0.5;
        return 0;
      } else {
        actualDamage -= this.shieldHp;
        this.shieldHp = 0;
      }
    }

    // Réduction par l'armure
    const effectiveArmor = this.effectiveArmor || this.armor;
    const mitigated = Math.max(1, Math.round(actualDamage * (1 - effectiveArmor)));

    // Passif Légendaire : Égide Céleste (1 fois par étage)
    if (this.hp - mitigated <= 0 && this.passives && this.passives.some(p => p.includes('Égide Céleste')) && !this.aegisUsedThisFloor) {
      this.aegisUsedThisFloor = true;
      this.hp = 1;
      this.hitCooldown = 1.0;
      soundEngine.playLevelUp();
      damageNumbers.push(new DamageNumber(this.x, this.y - 20, 'ÉGIDE CÉLESTE (SURVIE) !', '#fbbf24', true));
      return 0;
    }

    this.hp -= mitigated;
    this.hitCooldown = 0.5;
    soundEngine.playHit();
    damageNumbers.push(new DamageNumber(this.x, this.y - 15, `-${mitigated}`, '#ef4444', true));

    return mitigated;
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  restoreMana(amount) {
    this.mana = Math.min(this.maxMana, this.mana + amount);
  }

  draw(ctx, spriteSheet) {
    ctx.save();

    // Rendu ombre portée
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 12, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Clignotement de dégât ou invisibilité
    if (this.hitCooldown > 0) {
      ctx.filter = 'brightness(2.0)';
    }
    if (this.invisibleTimer > 0) {
      ctx.globalAlpha = 0.45;
    }

    // Rendu du sprite
    const spriteName = this.classDef.sprite.replace('assets/sprites/', '');
    const sprite = spriteSheet[spriteName];

    ctx.translate(this.x, this.y);
    if (this.facingLeft) {
      ctx.scale(-1, 1);
    }

    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.drawImage(sprite, -16, -16, 32, 32);
    } else {
      // Fallback
      ctx.fillStyle = this.classDef.color;
      ctx.fillRect(-12, -12, 24, 24);
    }

    ctx.restore();

    // Arc d'attaque physique
    if (this.swingAnim > 0) {
      ctx.save();
      ctx.strokeStyle = this.classDef.color;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 8;
      ctx.shadowColor = this.classDef.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 36, this.swingAngle - 0.6, this.swingAngle + 0.6);
      ctx.stroke();
      ctx.restore();
    }

    // Bouclier actif
    if (this.shieldHp > 0) {
      ctx.save();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#00f0ff';
      ctx.beginPath();
      ctx.arc(this.x, this.y, 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

class Enemy {
  constructor(type, x, y, floor = 1) {
    this.type = type; // 'swarmer', 'archer', 'mage', 'tank', 'boss'
    this.x = x;
    this.y = y;
    this.floor = floor;
    this.isBoss = (type === 'boss');

    const floorMult = 1 + (floor - 1) * 0.22;
    this.setupStats(floorMult);

    this.vx = 0;
    this.vy = 0;
    this.hitCooldown = 0;
    this.shootCooldown = Math.random() * 1.5;
    this.freezeTimer = 0;
    this.poisonTimer = 0;
    this.poisonDps = 0;
    this.facingLeft = false;

    // État spécifique du Boss
    if (this.isBoss) {
      this.bossPhase = 1;
      this.attackCycle = 0;
      this.teleportCooldown = 6.0;
    }
  }

  setupStats(mult) {
    switch (this.type) {
      case 'swarmer':
        this.name = 'Goule Rôdeuse';
        this.spriteName = 'enemy_swarmer.png';
        this.maxHp = Math.round(45 * mult);
        this.speed = 2.4;
        this.damage = Math.round(14 * mult);
        this.radius = 12;
        this.xpSouls = 3;
        this.gold = 5;
        break;

      case 'archer':
        this.name = 'Squelette Archer';
        this.spriteName = 'enemy_archer.png';
        this.maxHp = Math.round(35 * mult);
        this.speed = 1.8;
        this.damage = Math.round(16 * mult);
        this.radius = 11;
        this.xpSouls = 4;
        this.gold = 8;
        break;

      case 'mage':
        this.name = 'Sorcier Nécromancien';
        this.spriteName = 'enemy_mage.png';
        this.maxHp = Math.round(55 * mult);
        this.speed = 1.6;
        this.damage = Math.round(20 * mult);
        this.radius = 13;
        this.xpSouls = 6;
        this.gold = 12;
        break;

      case 'tank':
        this.name = 'Garde Cuirassé';
        this.spriteName = 'enemy_tank.png';
        this.maxHp = Math.round(120 * mult);
        this.speed = 1.3;
        this.damage = Math.round(26 * mult);
        this.radius = 16;
        this.armor = 0.35;
        this.xpSouls = 8;
        this.gold = 18;
        break;

      case 'boss':
        this.name = 'Le Souverain Déchu (Roi Spectre)';
        this.spriteName = 'enemy_boss.png';
        this.maxHp = Math.round(550 * mult * 1.5);
        this.speed = 1.7;
        this.damage = Math.round(28 * mult);
        this.radius = 24;
        this.xpSouls = 35;
        this.gold = 120;
        break;
    }
    this.hp = this.maxHp;
  }

  update(dt, player, dungeon, soundEngine, projectiles, damageNumbers) {
    if (this.hp <= 0) return;

    // Gestion du gel & poison
    if (this.freezeTimer > 0) {
      this.freezeTimer -= dt;
      return; // Immobilisé
    }

    if (this.poisonTimer > 0) {
      this.poisonTimer -= dt;
      this.hp -= this.poisonDps * dt;
      if (Math.random() < 0.15) {
        damageNumbers.push(new DamageNumber(this.x, this.y - 10, `${Math.round(this.poisonDps)}`, '#10b981'));
      }
      if (this.hp <= 0) {
        soundEngine.playEnemyDeath();
        return;
      }
    }

    // Si le joueur est invisible (Voile d'Ombre de l'Assassin), les ennemis ne le ciblent pas
    if (player.invisibleTimer > 0) {
      return;
    }

    if (this.hitCooldown > 0) this.hitCooldown -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;

    const dist = Math.hypot(player.x - this.x, player.y - this.y);
    const angle = Math.atan2(player.y - this.y, player.x - this.x);

    this.facingLeft = (player.x < this.x);

    // IA selon le type
    if (this.type === 'swarmer') {
      // Fonce directement au corps-à-corps
      if (dist < 400) {
        const mx = Math.cos(angle) * this.speed * 60 * dt;
        const my = Math.sin(angle) * this.speed * 60 * dt;
        if (dungeon.isWalkable(this.x + mx, this.y, this.radius)) this.x += mx;
        if (dungeon.isWalkable(this.x, this.y + my, this.radius)) this.y += my;

        if (dist < this.radius + player.radius) {
          player.takeDamage(this.damage, soundEngine, damageNumbers, this.name);
        }
      }
    } else if (this.type === 'archer') {
      // Garde une distance d'environ 180px et tire
      if (dist < 140) {
        // Recule
        const mx = -Math.cos(angle) * this.speed * 60 * dt;
        const my = -Math.sin(angle) * this.speed * 60 * dt;
        if (dungeon.isWalkable(this.x + mx, this.y, this.radius)) this.x += mx;
        if (dungeon.isWalkable(this.x, this.y + my, this.radius)) this.y += my;
      } else if (dist > 220 && dist < 420) {
        // S'approche
        const mx = Math.cos(angle) * this.speed * 60 * dt;
        const my = Math.sin(angle) * this.speed * 60 * dt;
        if (dungeon.isWalkable(this.x + mx, this.y, this.radius)) this.x += mx;
        if (dungeon.isWalkable(this.x, this.y + my, this.radius)) this.y += my;
      }

      // Tir d'une flèche
      if (this.shootCooldown <= 0 && dist < 380) {
        this.shootCooldown = 1.8;
        soundEngine.playHit();
        projectiles.push(new Projectile({
          x: this.x,
          y: this.y,
          vx: Math.cos(angle) * 7.5,
          vy: Math.sin(angle) * 7.5,
          damage: this.damage,
          isPlayer: false,
          color: '#e0aaff',
          radius: 5
        }));
      }
    } else if (this.type === 'mage') {
      // Déplacement d'approche et recul tactique
      if (dist < 160) {
        // Recule
        const mx = -Math.cos(angle) * this.speed * 60 * dt;
        const my = -Math.sin(angle) * this.speed * 60 * dt;
        if (dungeon.isWalkable(this.x + mx, this.y, this.radius)) this.x += mx;
        if (dungeon.isWalkable(this.x, this.y + my, this.radius)) this.y += my;
      } else if (dist > 260 && dist < 420) {
        // S'approche
        const mx = Math.cos(angle) * this.speed * 60 * dt;
        const my = Math.sin(angle) * this.speed * 60 * dt;
        if (dungeon.isWalkable(this.x + mx, this.y, this.radius)) this.x += mx;
        if (dungeon.isWalkable(this.x, this.y + my, this.radius)) this.y += my;
      }

      // Tire des crânes d'ombre téléguidés
      if (this.shootCooldown <= 0 && dist < 400) {
        this.shootCooldown = 2.4;
        soundEngine.playMagicCast();
        projectiles.push(new Projectile({
          x: this.x,
          y: this.y,
          vx: Math.cos(angle) * 5.0,
          vy: Math.sin(angle) * 5.0,
          damage: this.damage,
          isPlayer: false,
          color: '#ff0055',
          radius: 6,
          homing: 1.8
        }));
      }
    } else if (this.type === 'tank') {
      // Avance inexorablement et frappe lourdement
      if (dist < 420) {
        const mx = Math.cos(angle) * this.speed * 60 * dt;
        const my = Math.sin(angle) * this.speed * 60 * dt;
        if (dungeon.isWalkable(this.x + mx, this.y, this.radius)) this.x += mx;
        if (dungeon.isWalkable(this.x, this.y + my, this.radius)) this.y += my;

        if (dist < this.radius + player.radius) {
          player.takeDamage(this.damage, soundEngine, damageNumbers, this.name);
        }
      }
    } else if (this.type === 'boss') {
      // IA DU SOUVERAIN DÉCHU
      if (this.hp < this.maxHp * 0.5 && this.bossPhase === 1) {
        this.bossPhase = 2;
        this.speed *= 1.3;
        soundEngine.playBossRoar();
        damageNumbers.push(new DamageNumber(this.x, this.y - 30, 'ENRAGÉ : PHRASE FINALE !', '#ff0033', true));
      }

      const mx = Math.cos(angle) * this.speed * 60 * dt;
      const my = Math.sin(angle) * this.speed * 60 * dt;
      if (dungeon.isWalkable(this.x + mx, this.y, this.radius)) this.x += mx;
      if (dungeon.isWalkable(this.x, this.y + my, this.radius)) this.y += my;

      // Contact Boss
      if (dist < this.radius + player.radius) {
        player.takeDamage(this.damage, soundEngine, damageNumbers, this.name);
      }

      // Attaques du Boss
      if (this.shootCooldown <= 0) {
        this.shootCooldown = this.bossPhase === 2 ? 1.5 : 2.2;
        this.attackCycle = (this.attackCycle + 1) % 2;

        if (this.attackCycle === 0) {
          // Salve de 5 lames spectrales
          soundEngine.playBossRoar();
          for (let i = -2; i <= 2; i++) {
            const spreadAngle = angle + (i * 0.22);
            projectiles.push(new Projectile({
              x: this.x,
              y: this.y,
              vx: Math.cos(spreadAngle) * 6.5,
              vy: Math.sin(spreadAngle) * 6.5,
              damage: this.damage,
              isPlayer: false,
              color: '#ff0033',
              radius: 7
            }));
          }
        } else {
          // Onde de choc d'anneaux abyssaux
          soundEngine.playMagicCast();
          const blades = this.bossPhase === 2 ? 10 : 8;
          for (let i = 0; i < blades; i++) {
            const ringAngle = (i / blades) * Math.PI * 2;
            projectiles.push(new Projectile({
              x: this.x,
              y: this.y,
              vx: Math.cos(ringAngle) * 5.0,
              vy: Math.sin(ringAngle) * 5.0,
              damage: this.damage * 0.8,
              isPlayer: false,
              color: '#9d4edd',
              radius: 6
            }));
          }
        }
      }
    }
  }

  takeDamage(amount, soundEngine, damageNumbers, isCrit = false) {
    if (this.hp <= 0) return 0;
    const mitigated = Math.max(1, Math.round(amount * (1 - (this.armor || 0))));
    this.hp -= mitigated;
    this.hitCooldown = 0.15;
    soundEngine.playHit();

    damageNumbers.push(new DamageNumber(this.x, this.y - 12, `${mitigated}`, isCrit ? '#f59e0b' : '#f8fafc', isCrit));

    if (this.hp <= 0) {
      soundEngine.playEnemyDeath();
    }
    return mitigated;
  }

  draw(ctx, spriteSheet) {
    if (this.hp <= 0) return;
    ctx.save();

    // Ombre portée
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + this.radius, this.radius * 0.8, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    if (this.hitCooldown > 0) {
      ctx.filter = 'brightness(2.5)';
    }

    if (this.freezeTimer > 0) {
      ctx.filter = 'hue-rotate(180deg) brightness(1.2)';
    }

    ctx.translate(this.x, this.y);
    if (this.facingLeft) {
      ctx.scale(-1, 1);
    }

    const sprite = spriteSheet[this.spriteName];
    const size = this.isBoss ? 48 : 32;

    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
    } else {
      ctx.fillStyle = this.isBoss ? '#7209b7' : '#ef4444';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Barre de vie au-dessus de l'ennemi (hors Boss qui a une barre HUD dédiée)
    if (!this.isBoss && this.hp < this.maxHp) {
      const barW = 28;
      const barH = 4;
      const pct = Math.max(0, this.hp / this.maxHp);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(this.x - barW / 2, this.y - this.radius - 8, barW, barH);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(this.x - barW / 2, this.y - this.radius - 8, barW * pct, barH);
    }
  }
}

window.DamageNumber = DamageNumber;
window.Projectile = Projectile;
window.DropItem = DropItem;
window.Player = Player;
window.Enemy = Enemy;
