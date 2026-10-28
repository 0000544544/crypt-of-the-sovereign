/**
 * CRYPT OF THE SOVEREIGN - CLASS & HERO DEFINITIONS
 * 3 Héros jouables avec statistiques, compétences, esquives et gameplay asymétrique.
 */

const HERO_CLASSES = {
  knight: {
    id: 'knight',
    name: 'Chevalier Mystique',
    title: 'Garde Royal de la Crypte',
    sprite: 'assets/sprites/hero_knight.png',
    color: '#00f0ff',
    lore: 'Vétéran des guerres sacrées. Protégé par une armure de plaques runiques, il excelle au corps-à-corps et absorbe les chocs grâce à sa foi inébranlable.',
    stats: {
      maxHp: 160,
      maxMana: 60,
      maxStamina: 100,
      speed: 2.8,
      armor: 0.25, // 25% de réduction
      critChance: 0.10,
      critMultiplier: 1.75,
      manaRegen: 2.0
    },
    primaryAttack: {
      name: 'Entaille Sacrée',
      desc: 'Coup d\'épée en arc de 120° fendant plusieurs ennemis avec repoussement.',
      damage: 34,
      range: 48,
      arc: Math.PI * 0.65,
      cooldown: 0.36,
      knockback: 16
    },
    specialSkill: {
      name: 'Bouclier Sanctuaire',
      desc: 'Onde de choc radiale à 360° qui étourdit les ennemis et confère une barrière protectrice de 45 PV.',
      cooldown: 8.0,
      manaCost: 25,
      radius: 90,
      damage: 25,
      shieldValue: 45,
      shieldDuration: 4.5
    },
    roll: {
      name: 'Charge de Fer',
      desc: 'Roulade lourde invincible traversant projectiles et ennemis.',
      duration: 0.32,
      speedMult: 1.8,
      staminaCost: 30,
      cooldown: 0.4
    }
  },

  mage: {
    id: 'mage',
    name: 'Archimage Arcanique',
    title: 'Erudit de l\'Académie Astrale',
    sprite: 'assets/sprites/hero_mage.png',
    color: '#7209b7',
    lore: 'Canalisateur des énergies du Néant. Ses sorts anéantissent des salles entières à distance, mais sa constitution physique fragile exige un placement irréprochable.',
    stats: {
      maxHp: 95,
      maxMana: 160,
      maxStamina: 80,
      speed: 2.6,
      armor: 0.08,
      critChance: 0.18,
      critMultiplier: 2.0,
      manaRegen: 7.0
    },
    primaryAttack: {
      name: 'Orbe Arcanique',
      desc: 'Tir d\'énergie magique véloce qui perfore un ennemi et détonne à l\'impact.',
      damage: 28,
      range: 350,
      cooldown: 0.30,
      projectileSpeed: 9.0,
      projectileRadius: 7,
      pierce: 1
    },
    specialSkill: {
      name: 'Nova de Givre',
      desc: 'Déflagration glaciale circulaire de 160px infligeant 50 dégâts et gelant les monstres pendant 2.5s.',
      cooldown: 7.0,
      manaCost: 40,
      radius: 140,
      damage: 50,
      freezeDuration: 2.5
    },
    roll: {
      name: 'Blink Astral',
      desc: 'Téléportation instantanée de 140px avec onde de choc et invulnérabilité.',
      duration: 0.22,
      speedMult: 2.8,
      staminaCost: 35,
      cooldown: 0.5
    }
  },

  rogue: {
    id: 'rogue',
    name: 'Assassin d\'Ombre',
    title: 'Lame du Crépuscule',
    sprite: 'assets/sprites/hero_rogue.png',
    color: '#06d6a0',
    lore: 'Maître des poisons et des frappes chirurgicales. Sa vélocité prodigieuse et ses frappes critiques fatales font de lui un prédateur mortel.',
    stats: {
      maxHp: 115,
      maxMana: 80,
      maxStamina: 125,
      speed: 3.4,
      armor: 0.12,
      critChance: 0.32,
      critMultiplier: 2.5,
      manaRegen: 3.5
    },
    primaryAttack: {
      name: 'Double Dagues Fantômes',
      desc: 'Deux entailles chirurgicales ultra-rapides appliquant un poison nécrotique.',
      damage: 20,
      hits: 2,
      range: 40,
      arc: Math.PI * 0.5,
      cooldown: 0.20,
      poisonDamage: 8,
      poisonDuration: 3.0
    },
    specialSkill: {
      name: 'Voile d\'Ombre',
      desc: 'Dissimulation complète pendant 3.5s (+50% vitesse). La prochaine attaque est un Coup Critique garanti à 300%.',
      cooldown: 8.5,
      manaCost: 30,
      duration: 3.5,
      speedBoost: 1.5,
      guaranteedCrit: 3.0
    },
    roll: {
      name: 'Foulée Spectrale',
      desc: 'Dash furtif d\'esquive fluide avec temps de recharge quasi instantané.',
      duration: 0.25,
      speedMult: 2.2,
      staminaCost: 22,
      cooldown: 0.25
    }
  }
};

window.HERO_CLASSES = HERO_CLASSES;
