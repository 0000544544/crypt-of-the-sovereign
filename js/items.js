/**
 * CRYPT OF THE SOVEREIGN - ITEMS, LOOT & INVENTORY ENGINE
 * Objets procéduraux avec 4 paliers de rareté (Commun, Rare, Épique, Légendaire)
 * et gestion de l'équipement (Arme, Armure, Anneau, Potions).
 */

const ITEM_RARITIES = {
  common: {
    id: 'common',
    name: 'Commun',
    color: '#e2e8f0',
    borderColor: '#94a3b8',
    glow: 'none',
    statCount: 1,
    multiplier: 1.0,
    price: 30
  },
  rare: {
    id: 'rare',
    name: 'Rare',
    color: '#38bdf8',
    borderColor: '#0284c7',
    glow: '0 0 10px rgba(56, 189, 248, 0.4)',
    statCount: 2,
    multiplier: 1.4,
    price: 75
  },
  epic: {
    id: 'epic',
    name: 'Épique',
    color: '#c084fc',
    borderColor: '#9333ea',
    glow: '0 0 12px rgba(192, 132, 252, 0.6)',
    statCount: 3,
    multiplier: 1.85,
    price: 150
  },
  legendary: {
    id: 'legendary',
    name: 'LÉGENDAIRE',
    color: '#fbbf24',
    borderColor: '#d97706',
    glow: '0 0 16px rgba(251, 191, 36, 0.8)',
    statCount: 4,
    multiplier: 2.5,
    price: 320
  }
};

const BASE_ITEM_TEMPLATES = [
  // Armes
  {
    type: 'weapon',
    baseName: 'Épée de Templier',
    sprite: 'assets/sprites/item_sword.png',
    baseDamage: 18,
    prefClass: 'knight',
    desc: 'Lame d\'acier équilibrée portant des runes de lumière.'
  },
  {
    type: 'weapon',
    baseName: 'Sceptre Arcanique',
    sprite: 'assets/sprites/item_staff.png',
    baseDamage: 16,
    prefClass: 'mage',
    desc: 'Canalyseur d\'éther pur concentrant la volonté magique.'
  },
  {
    type: 'weapon',
    baseName: 'Dagues de l\'Ombre',
    sprite: 'assets/sprites/item_dagger.png',
    baseDamage: 12,
    prefClass: 'rogue',
    desc: 'Lames incurvées trempées dans le venin de scorpion abyssal.'
  },

  // Armures
  {
    type: 'armor',
    baseName: 'Cuirasse de Plates',
    sprite: 'assets/sprites/item_armor_heavy.png',
    baseHp: 40,
    baseArmor: 0.12,
    desc: 'Plaques d\'acier forgé offrant une protection solide contre les coups.'
  },
  {
    type: 'armor',
    baseName: 'Robe des Étoiles',
    sprite: 'assets/sprites/item_armor_robe.png',
    baseHp: 20,
    baseMana: 35,
    baseManaRegen: 3.0,
    desc: 'Tissu enchanté amplifiant la régénération de mana.'
  },
  {
    type: 'armor',
    baseName: 'Brigandine de Cuir',
    sprite: 'assets/sprites/item_armor_leather.png',
    baseHp: 30,
    baseSpeed: 0.35,
    desc: 'Armure légère souple permettant des déplacements furtifs et véloces.'
  },

  // Anneaux
  {
    type: 'ring',
    baseName: 'Anneau de Vitalité',
    sprite: 'assets/sprites/item_ring.png',
    baseHp: 25,
    baseCrit: 0.05,
    desc: 'Bague ornée d\'un rubis pulsant au rythme du cœur du porteur.'
  },
  {
    type: 'ring',
    baseName: 'Chevalière du Souverain',
    sprite: 'assets/sprites/item_ring.png',
    baseDamage: 8,
    baseSoulBonus: 0.25,
    desc: 'Ancien anneau royal décuplant la récolte des âmes de la crypte.'
  }
];

const PREFIXES = [
  { name: 'Brutal', stat: 'damage', val: 6 },
  { name: 'Ardent', stat: 'damage', val: 9 },
  { name: 'Robuste', stat: 'hp', val: 25 },
  { name: 'Spectral', stat: 'speed', val: 0.3 },
  { name: 'Mystique', stat: 'mana', val: 20 },
  { name: 'Létal', stat: 'crit', val: 0.08 }
];

const SUFFIXES = [
  { name: 'du Titan', stat: 'hp', val: 35 },
  { name: 'du Berserker', stat: 'damage', val: 12 },
  { name: 'du Zéphyr', stat: 'speed', val: 0.4 },
  { name: 'des Abysses', stat: 'crit', val: 0.10 },
  { name: 'de Renaissance', stat: 'manaRegen', val: 2.5 }
];

const LEGENDARY_PASSIVES = [
  'Vampirisme : 8% des dégâts infligés convertis en soins',
  'Exécution : Les ennemis sous 20% PV sont instantanément pulvérisés',
  'Égide Céleste : Absorbe entièrement le premier coup fatal subi par étage',
  'Tempête d\'Âmes : +25% de dégâts pour chaque ennemi tué dans la salle'
];

const RUNES_CONFIG = {
  rune_fire: {
    id: 'rune_fire',
    name: 'Rune de Flammes Éternelles',
    type: 'rune',
    sprite: 'assets/sprites/item_rune_fire.png',
    color: '#ff5400',
    desc: 'Ajoute 15 dégâts de brûlure sur la durée (DoT de feu) à chaque impact.',
    stats: { fireBurn: 15 },
    price: 90
  },
  rune_lifesteal: {
    id: 'rune_lifesteal',
    name: 'Rune de Sang Abyssal',
    type: 'rune',
    sprite: 'assets/sprites/item_rune_lifesteal.png',
    color: '#d90429',
    desc: 'Confère +6% de vol de vie (soins basés sur les dégâts infligés).',
    stats: { lifesteal: 0.06 },
    price: 110
  },
  rune_haste: {
    id: 'rune_haste',
    name: 'Rune de Tempête Céleste',
    type: 'rune',
    sprite: 'assets/sprites/item_rune_haste.png',
    color: '#ffb703',
    desc: '+15% de vitesse de déplacement et vélocité martiale.',
    stats: { speed: 0.45 },
    price: 85
  },
  rune_frost: {
    id: 'rune_frost',
    name: 'Rune du Zéro Absolu',
    type: 'rune',
    sprite: 'assets/sprites/item_rune_frost.png',
    color: '#38bdf8',
    desc: '25% de chance de geler les ennemis touchés pendant 1.5s.',
    stats: { frostChance: 0.25 },
    price: 95
  },
  gem_ruby: {
    id: 'gem_ruby',
    name: 'Rubis de Vitalité Pure',
    type: 'gem',
    sprite: 'assets/sprites/item_gem_ruby.png',
    color: '#ef233c',
    desc: '+35 Points de Vie Maximum.',
    stats: { hp: 35 },
    price: 70
  },
  gem_sapphire: {
    id: 'gem_sapphire',
    name: 'Saphir Astral Luminescent',
    type: 'gem',
    sprite: 'assets/sprites/item_gem_sapphire.png',
    color: '#3b82f6',
    desc: '+35 Points de Mana Maximum et +1.5 Regen Mana.',
    stats: { mana: 35, manaRegen: 1.5 },
    price: 70
  },
  gem_emerald: {
    id: 'gem_emerald',
    name: 'Émeraude du Faucon',
    type: 'gem',
    sprite: 'assets/sprites/item_gem_emerald.png',
    color: '#10b981',
    desc: '+10% de Chance de Coup Critique.',
    stats: { crit: 0.10 },
    price: 75
  }
};

class ItemGenerator {
  static createItem(floor = 1, forceRarity = null, forceType = null) {
    // 1. Détermination de la rareté
    let rarityKey = forceRarity;
    if (!rarityKey) {
      const rand = Math.random() + (floor * 0.04);
      if (rand > 1.15) rarityKey = 'legendary';
      else if (rand > 0.85) rarityKey = 'epic';
      else if (rand > 0.45) rarityKey = 'rare';
      else rarityKey = 'common';
    }

    const rarity = ITEM_RARITIES[rarityKey];

    // 2. Choix du template
    let validTemplates = BASE_ITEM_TEMPLATES;
    if (forceType) {
      validTemplates = BASE_ITEM_TEMPLATES.filter(t => t.type === forceType);
    }
    const template = validTemplates[Math.floor(Math.random() * validTemplates.length)];

    // 3. Calcul des statistiques
    const mult = rarity.multiplier * (1 + (floor - 1) * 0.15);
    const stats = {};

    if (template.baseDamage) stats.damage = Math.round(template.baseDamage * mult);
    if (template.baseHp) stats.hp = Math.round(template.baseHp * mult);
    if (template.baseArmor) stats.armor = +(template.baseArmor * mult).toFixed(2);
    if (template.baseMana) stats.mana = Math.round(template.baseMana * mult);
    if (template.baseSpeed) stats.speed = +(template.baseSpeed * (0.8 + mult * 0.2)).toFixed(2);
    if (template.baseCrit) stats.crit = +(template.baseCrit * mult).toFixed(2);
    if (template.baseManaRegen) stats.manaRegen = +(template.baseManaRegen * mult).toFixed(1);
    if (template.baseSoulBonus) stats.soulBonus = +(template.baseSoulBonus * mult).toFixed(2);

    // Ajout d'affixes selon rareté
    let fullName = template.baseName;
    const usedStats = new Set(Object.keys(stats));

    if (rarity.statCount >= 2) {
      const p = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
      fullName = `${p.name} ${fullName}`;
      stats[p.stat] = (stats[p.stat] || 0) + (typeof p.val === 'number' && p.val < 1 ? +(p.val * mult).toFixed(2) : Math.round(p.val * mult));
    }

    if (rarity.statCount >= 3) {
      const s = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
      fullName = `${fullName} ${s.name}`;
      stats[s.stat] = (stats[s.stat] || 0) + (typeof s.val === 'number' && s.val < 1 ? +(s.val * mult).toFixed(2) : Math.round(s.val * mult));
    }

    let legendaryEffect = null;
    if (rarityKey === 'legendary') {
      legendaryEffect = LEGENDARY_PASSIVES[Math.floor(Math.random() * LEGENDARY_PASSIVES.length)];
    }

    // Emplacements de Châsses (Sockets) pour Runes & Gemmes
    let maxSockets = 0;
    if (rarityKey === 'rare') maxSockets = 1;
    else if (rarityKey === 'epic') maxSockets = 2;
    else if (rarityKey === 'legendary') maxSockets = 3;

    return {
      id: 'item_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
      name: fullName,
      type: template.type,
      rarity: rarityKey,
      sprite: template.sprite,
      desc: template.desc,
      stats,
      price: Math.round(rarity.price * (1 + (floor - 1) * 0.2)),
      legendaryEffect,
      maxSockets,
      sockets: [] // Contiendra les runes/gemmes serties
    };
  }

  static createRuneOrGem(floor = 1) {
    const keys = Object.keys(RUNES_CONFIG);
    const chosenKey = keys[Math.floor(Math.random() * keys.length)];
    const def = RUNES_CONFIG[chosenKey];
    return {
      id: 'rune_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
      name: def.name,
      type: def.type,
      rarity: def.type === 'gem' ? 'rare' : 'epic',
      sprite: def.sprite,
      desc: def.desc,
      stats: { ...def.stats },
      color: def.color,
      price: Math.round(def.price * (1 + (floor - 1) * 0.15))
    };
  }

  static createHealthPotion() {
    return {
      id: 'pot_hp_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      name: 'Potion de Soin Majeure',
      type: 'potion',
      potionType: 'health',
      rarity: 'common',
      sprite: 'assets/sprites/item_potion_health.png',
      desc: 'Restaure immédiatement 65 points de vie.',
      healValue: 65,
      price: 25
    };
  }

  static createManaPotion() {
    return {
      id: 'pot_mana_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      name: 'Élixir Arcanique',
      type: 'potion',
      potionType: 'mana',
      rarity: 'common',
      sprite: 'assets/sprites/item_potion_mana.png',
      desc: 'Restaure immédiatement 75 points de mana.',
      manaValue: 75,
      price: 25
    };
  }
}

class InventoryManager {
  constructor(maxBagSlots = 16) {
    this.maxBagSlots = maxBagSlots;
    this.bag = []; // Array d'items

    this.equipped = {
      weapon: null,
      armor: null,
      ring: null
    };

    this.potions = {
      health: 2,
      mana: 1
    };

    this.gold = 0;
    this.souls = 0;
  }

  addItem(item) {
    if (item.type === 'potion') {
      if (item.potionType === 'health') {
        this.potions.health++;
        return true;
      } else if (item.potionType === 'mana') {
        this.potions.mana++;
        return true;
      }
    }

    if (this.bag.length >= this.maxBagSlots) {
      return false; // Inventaire plein
    }
    this.bag.push(item);
    return true;
  }

  equip(bagIndex) {
    const item = this.bag[bagIndex];
    if (!item || !['weapon', 'armor', 'ring'].includes(item.type)) return false;

    const previousEquipped = this.equipped[item.type];
    this.equipped[item.type] = item;
    this.bag.splice(bagIndex, 1);

    if (previousEquipped) {
      this.bag.push(previousEquipped);
    }
    return true;
  }

  // Sertissage d'une rune ou gemme dans un objet ayant des châsses libres
  socketRune(targetItem, runeItem) {
    if (!targetItem || !runeItem) return false;
    if (!['weapon', 'armor', 'ring'].includes(targetItem.type)) return false;
    if (!['rune', 'gem'].includes(runeItem.type)) return false;
    if (!targetItem.sockets) targetItem.sockets = [];
    if (targetItem.sockets.length >= (targetItem.maxSockets || 0)) return false;

    // Retirer la rune du sac
    const idx = this.bag.indexOf(runeItem);
    if (idx !== -1) {
      this.bag.splice(idx, 1);
    }
    targetItem.sockets.push(runeItem);
    return true;
  }

  // Dessertir toutes les runes/gemmes d'un objet (rendu au sac)
  unsocketRunes(item) {
    if (!item || !item.sockets || item.sockets.length === 0) return false;
    while (item.sockets.length > 0 && this.bag.length < this.maxBagSlots) {
      const r = item.sockets.pop();
      this.bag.push(r);
    }
    return true;
  }

  unequip(slotType) {
    const item = this.equipped[slotType];
    if (!item) return false;
    if (this.bag.length >= this.maxBagSlots) return false;

    this.equipped[slotType] = null;
    this.bag.push(item);
    return true;
  }

  dropItem(bagIndex) {
    if (bagIndex < 0 || bagIndex >= this.bag.length) return null;
    return this.bag.splice(bagIndex, 1)[0];
  }

  usePotion(type, player, soundEngine) {
    const potencyMult = 1 + (player?.meta?.alchemist?.potency || 0);
    if (type === 'health') {
      if (this.potions.health <= 0 || player.hp >= player.maxHp) return false;
      this.potions.health--;
      player.heal(Math.round(65 * potencyMult));
      soundEngine?.playPotion();
      return true;
    } else if (type === 'mana') {
      if (this.potions.mana <= 0 || player.mana >= player.maxMana) return false;
      this.potions.mana--;
      player.restoreMana(Math.round(75 * potencyMult));
      soundEngine?.playPotion();
      return true;
    }
    return false;
  }

  getNetEquipmentStats() {
    const net = {
      damage: 0,
      hp: 0,
      armor: 0,
      mana: 0,
      speed: 0,
      crit: 0,
      manaRegen: 0,
      soulBonus: 0,
      fireBurn: 0,
      lifesteal: 0,
      frostChance: 0,
      passives: []
    };

    for (const slot of ['weapon', 'armor', 'ring']) {
      const item = this.equipped[slot];
      if (item && item.stats) {
        // Stats de base
        for (const [k, v] of Object.entries(item.stats)) {
          if (net[k] !== undefined) {
            net[k] += v;
          }
        }
        if (item.legendaryEffect) {
          net.passives.push(item.legendaryEffect);
        }

        // Stats des Runes & Gemmes serties dans l'objet
        if (item.sockets && item.sockets.length > 0) {
          for (const s of item.sockets) {
            if (s && s.stats) {
              for (const [sk, sv] of Object.entries(s.stats)) {
                if (net[sk] !== undefined) {
                  net[sk] += sv;
                }
              }
            }
          }
        }
      }
    }

    return net;
  }
}

window.ItemGenerator = ItemGenerator;
window.InventoryManager = InventoryManager;
window.ITEM_RARITIES = ITEM_RARITIES;
window.RUNES_CONFIG = RUNES_CONFIG;
