/**
 * CRYPT OF THE SOVEREIGN - ENTITIES & COMBAT SYSTEM
 * Joueur, Bestiaire IA (Swarmer, Archer, Nécromancien, Tank, Boss Souverain Déchu),
 * Projectiles magiques, Objets au sol, Particules dynamiques et Textes flottants de combat.
 */

class Particle {
  constructor(x, y, vx, vy, color, size, life, shape = 'square', gravity = 0) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.life = life;
    this.maxLife = life;
    this.shape = shape; // 'square', 'circle', 'spark'
    this.gravity = gravity;
  }

  update(dt) {
    this.life -= dt;
    this.vy += this.gravity * dt;
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.vx *= 0.94;
    this.vy *= 0.94;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    if (this.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, Math.max(0.5, this.size * alpha), 0, Math.PI * 2);
      ctx.fill();
    } else {
      const s = this.size * (0.35 + 0.65 * alpha);
      ctx.fillRect(this.x - s / 2, this.y - s / 2, s, s);
    }
    ctx.restore();
  }
}

class ParticleManager {
  constructor() {
    this.particles = [];
  }

  addHitSpark(x, y, color = '#f59e0b', count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2.8 + 1.2;
      this.particles.push(new Particle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color,
        Math.random() * 3 + 2,
        0.25 + Math.random() * 0.2,
        'spark'
      ));
    }
  }

  addDeathBurst(x, y, color = '#ef4444', count = 40) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4.2 + 1.5;
      const c = (Math.random() < 0.25) ? '#ffffff' : color;
      this.particles.push(new Particle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        c,
        Math.random() * 4 + 2,
        0.35 + Math.random() * 0.35,
        'square',
        40
      ));
    }
  }

  addTorchEmber(x, y) {
    this.particles.push(new Particle(
      x + (Math.random() * 10 - 5),
      y - 4,
      (Math.random() - 0.5) * 0.4,
      -(Math.random() * 0.8 + 0.5),
      Math.random() < 0.5 ? '#ffb703' : '#fb8500',
      Math.random() * 2.5 + 1.5,
      0.6 + Math.random() * 0.35,
      'circle'
    ));
  }

  addProjectileTrail(x, y, color) {
    this.particles.push(new Particle(
      x + (Math.random() * 4 - 2),
      y + (Math.random() * 4 - 2),
      (Math.random() - 0.5) * 0.25,
      (Math.random() - 0.5) * 0.25,
      color,
      Math.random() * 2.8 + 1.8,
      0.2,
      'circle'
    ));
  }

  addPoisonBubble(x, y) {
    this.particles.push(new Particle(
      x + (Math.random() * 16 - 8),
      y + (Math.random() * 10 - 5),
      (Math.random() - 0.5) * 0.3,
      -(Math.random() * 0.6 + 0.4),
      '#10b981',
      Math.random() * 3 + 1.5,
      0.45,
      'circle'
    ));
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update(dt);
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].draw(ctx);
    }
  }
}

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

    // Juice & Animations
    this.afterimages = [];
    this.afterimageTimer = 0;
    this.isMoving = false;
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

    // Gestion des images rémanentes (afterimages)
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      const ai = this.afterimages[i];
      ai.life -= dt;
      if (ai.life <= 0) this.afterimages.splice(i, 1);
    }
    if (this.isRolling || this.invisibleTimer > 0) {
      this.afterimageTimer -= dt;
      if (this.afterimageTimer <= 0) {
        this.afterimages.push({
          x: this.x,
          y: this.y,
          facingLeft: this.facingLeft,
          life: 0.22,
          maxLife: 0.22
        });
        this.afterimageTimer = 0.04;
      }
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
        this.isRolling = false;
        this.hitCooldown = 0.25;
        soundEngine.playMagicCast();
        this.activeShockwave = {
          x: this.x,
          y: this.y,
          radius: 80,
          color: '#4cc9f0',
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
    this.isMoving = (input.moveX !== 0 || input.moveY !== 0);
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
        color: '#00f0ff',
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
        color: '#7209b7',
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

    const spriteName = this.classDef.sprite.replace('assets/sprites/', '');
    const sprite = spriteSheet[spriteName];

    // Traînée d'images rémanentes (afterimages) pendant la roulade ou l'invisibilité
    for (const ai of this.afterimages) {
      const alpha = Math.max(0, ai.life / ai.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha * 0.4;
      ctx.translate(ai.x, ai.y);
      if (ai.facingLeft) ctx.scale(-1, 1);
      if (sprite && sprite.complete && sprite.naturalWidth > 0) {
        ctx.drawImage(sprite, -16, -16, 32, 32);
      }
      ctx.restore();
    }

    // Rendu ombre portée
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 12, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rebond de marche (bobbing) et inclinaison dynamique
    const bob = (this.isMoving && !this.isRolling) ? Math.abs(Math.sin(Date.now() * 0.015)) * 2.5 : 0;
    const tilt = (this.isMoving && !this.isRolling) ? (this.facingLeft ? -0.06 : 0.06) : 0;

    // Clignotement de dégât ou invisibilité
    if (this.hitCooldown > 0) {
      ctx.filter = 'brightness(2.0)';
    }
    if (this.invisibleTimer > 0) {
      ctx.globalAlpha = 0.45;
    }

    ctx.translate(this.x, this.y - bob);
    if (this.facingLeft) {
      ctx.scale(-1, 1);
    }
    ctx.rotate(tilt);

    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.drawImage(sprite, -16, -16, 32, 32);
    } else {
      ctx.fillStyle = this.classDef.color;
      ctx.fillRect(-12, -12, 24, 24);
    }

    ctx.restore();

    // Véritable arc d'attaque dégradé avec lueur
    if (this.swingAnim > 0) {
      ctx.save();
      const arcRadius = 38;
      const grad = ctx.createLinearGradient(
        this.x + Math.cos(this.swingAngle - 0.7) * arcRadius,
        this.y + Math.sin(this.swingAngle - 0.7) * arcRadius,
        this.x + Math.cos(this.swingAngle + 0.7) * arcRadius,
        this.y + Math.sin(this.swingAngle + 0.7) * arcRadius
      );
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
      grad.addColorStop(0.5, this.classDef.color);
      grad.addColorStop(1, '#ffffff');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 4;
      ctx.shadowBlur = 12;
      ctx.shadowColor = this.classDef.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, arcRadius, this.swingAngle - 0.75, this.swingAngle + 0.75);
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
    this.isMoving = false;

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
    this.isMoving = false;

    // Calcul de visibilité par rapport au brouillard de guerre du joueur
    const etx = Math.floor(this.x / TILE_SIZE);
    const ety = Math.floor(this.y / TILE_SIZE);
    const isVisibleToPlayer = (dungeon.visible[ety]?.[etx] === 1);

    // IA selon le type
    if (this.type === 'swarmer') {
      // Fonce directement au corps-à-corps
      if (dist < 400) {
        this.isMoving = true;
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
        this.isMoving = true;
        const mx = -Math.cos(angle) * this.speed * 60 * dt;
        const my = -Math.sin(angle) * this.speed * 60 * dt;
        if (dungeon.isWalkable(this.x + mx, this.y, this.radius)) this.x += mx;
        if (dungeon.isWalkable(this.x, this.y + my, this.radius)) this.y += my;
      } else if (dist > 220 && dist < 420) {
        // S'approche
        this.isMoving = true;
        const mx = Math.cos(angle) * this.speed * 60 * dt;
        const my = Math.sin(angle) * this.speed * 60 * dt;
        if (dungeon.isWalkable(this.x + mx, this.y, this.radius)) this.x += mx;
        if (dungeon.isWalkable(this.x, this.y + my, this.radius)) this.y += my;
      }

      // Tir d'une flèche (uniquement si visible par le joueur et à portée < 280)
      if (this.shootCooldown <= 0 && isVisibleToPlayer && dist < 280) {
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
        this.isMoving = true;
        const mx = -Math.cos(angle) * this.speed * 60 * dt;
        const my = -Math.sin(angle) * this.speed * 60 * dt;
        if (dungeon.isWalkable(this.x + mx, this.y, this.radius)) this.x += mx;
        if (dungeon.isWalkable(this.x, this.y + my, this.radius)) this.y += my;
      } else if (dist > 260 && dist < 420) {
        // S'approche
        this.isMoving = true;
        const mx = Math.cos(angle) * this.speed * 60 * dt;
        const my = Math.sin(angle) * this.speed * 60 * dt;
        if (dungeon.isWalkable(this.x + mx, this.y, this.radius)) this.x += mx;
        if (dungeon.isWalkable(this.x, this.y + my, this.radius)) this.y += my;
      }

      // Tire des crânes d'ombre téléguidés (uniquement si visible par le joueur et à portée < 280)
      if (this.shootCooldown <= 0 && isVisibleToPlayer && dist < 280) {
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
        this.isMoving = true;
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

      this.isMoving = true;
      const mx = Math.cos(angle) * this.speed * 60 * dt;
      const my = Math.sin(angle) * this.speed * 60 * dt;
      if (dungeon.isWalkable(this.x + mx, this.y, this.radius)) this.x += mx;
      if (dungeon.isWalkable(this.x, this.y + my, this.radius)) this.y += my;

      // Contact Boss
      if (dist < this.radius + player.radius) {
        player.takeDamage(this.damage, soundEngine, damageNumbers, this.name);
      }

      // Attaques du Boss (uniquement si visible par le joueur et à portée < 280)
      if (this.shootCooldown <= 0 && isVisibleToPlayer && dist < 280) {
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

    // Rebond de marche (bobbing) et inclinaison dynamique
    const bob = (this.isMoving && this.freezeTimer <= 0) ? Math.abs(Math.sin(Date.now() * 0.015 + this.x)) * 2 : 0;
    const tilt = (this.isMoving && this.freezeTimer <= 0) ? (this.facingLeft ? -0.05 : 0.05) : 0;

    if (this.hitCooldown > 0) {
      ctx.filter = 'brightness(2.5)';
    }

    if (this.freezeTimer > 0) {
      ctx.filter = 'hue-rotate(180deg) brightness(1.2)';
    }

    ctx.translate(this.x, this.y - bob);
    if (this.facingLeft) {
      ctx.scale(-1, 1);
    }
    ctx.rotate(tilt);

    const sprite = spriteSheet[this.spriteName];
    const size = this.isBoss ? 56 : 32;

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

window.Particle = Particle;
window.ParticleManager = ParticleManager;
window.DamageNumber = DamageNumber;
window.Projectile = Projectile;
window.DropItem = DropItem;
window.Player = Player;
window.Enemy = Enemy;
