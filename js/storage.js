/**
 * CRYPT OF THE SOVEREIGN - SAVE & META-PROGRESSION SYSTEM
 * Sauvegarde locale persistante (localStorage) gérant le sanctuaire, la forge, l'alchimiste et les statistiques.
 */

const STORAGE_KEY = 'crypt_sovereign_save_v1';

const META_UPGRADES_CONFIG = {
  forge: {
    id: 'forge',
    name: 'Forge des Réfugiés',
    icon: 'item_sword.png',
    maxLevel: 10,
    baseCost: 15,
    costMultiplier: 1.45,
    desc: '+8% de dégâts bruts permanents à toutes les attaques et sorts par niveau.',
    calcBonus: (lvl) => +(lvl * 0.08).toFixed(2)
  },
  alchemist: {
    id: 'alchemist',
    name: 'Atelier de l\'Alchimiste',
    icon: 'item_potion_health.png',
    maxLevel: 10,
    baseCost: 12,
    costMultiplier: 1.4,
    desc: '+10% d\'efficacité des potions et +1 potion de départ tous les 3 niveaux.',
    calcBonus: (lvl) => ({
      potency: +(lvl * 0.10).toFixed(2),
      bonusPotions: Math.floor(lvl / 3)
    })
  },
  vitality: {
    id: 'vitality',
    name: 'Bénédiction du Titan',
    icon: 'item_armor_heavy.png',
    maxLevel: 10,
    baseCost: 10,
    costMultiplier: 1.35,
    desc: '+20 Points de Vie Max de départ par niveau.',
    calcBonus: (lvl) => lvl * 20
  },
  soulHarvester: {
    id: 'soulHarvester',
    name: 'Autel de la Faucheuse',
    icon: 'item_soul_gem.png',
    maxLevel: 10,
    baseCost: 20,
    costMultiplier: 1.5,
    desc: '+15% de gemmes d\'âmes récoltées sur tous les monstres par niveau.',
    calcBonus: (lvl) => +(lvl * 0.15).toFixed(2)
  }
};

class StorageManager {
  constructor() {
    this.data = this.getDefaultData();
    this.load();
  }

  getDefaultData() {
    return {
      version: 1,
      totalSouls: 0,
      lifetimeSouls: 0,
      bestFloor: 1,
      totalKills: 0,
      bossesDefeated: 0,
      runsAttempted: 0,
      runsCompleted: 0,
      upgrades: {
        forge: 0,
        alchemist: 0,
        vitality: 0,
        soulHarvester: 0
      },
      achievements: {},
      settings: {
        masterVolume: 0.8,
        musicVolume: 0.5,
        sfxVolume: 0.8,
        crtFilter: false
      }
    };
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.data = { ...this.getDefaultData(), ...parsed };
        this.data.upgrades = { ...this.getDefaultData().upgrades, ...(parsed.upgrades || {}) };
        this.data.settings = { ...this.getDefaultData().settings, ...(parsed.settings || {}) };
      }
    } catch (e) {
      console.warn('[STORAGE] Erreur lors du chargement de la sauvegarde, valeur par défaut utilisée.', e);
      this.data = this.getDefaultData();
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('[STORAGE] Impossible de sauvegarder dans localStorage', e);
    }
  }

  getUpgradeCost(upgradeId) {
    const config = META_UPGRADES_CONFIG[upgradeId];
    if (!config) return Infinity;
    const currentLvl = this.data.upgrades[upgradeId] || 0;
    if (currentLvl >= config.maxLevel) return null; // Niveau max atteint

    return Math.round(config.baseCost * Math.pow(config.costMultiplier, currentLvl));
  }

  buyUpgrade(upgradeId) {
    const cost = this.getUpgradeCost(upgradeId);
    if (cost === null || this.data.totalSouls < cost) return false;

    this.data.totalSouls -= cost;
    this.data.upgrades[upgradeId] = (this.data.upgrades[upgradeId] || 0) + 1;
    this.save();
    return true;
  }

  addSouls(amount) {
    if (amount <= 0) return;
    this.data.totalSouls += amount;
    this.data.lifetimeSouls += amount;
    this.save();
  }

  recordRunEnd(stats) {
    this.data.runsAttempted++;
    if (stats.completed) this.data.runsCompleted++;
    if (stats.floor > this.data.bestFloor) this.data.bestFloor = stats.floor;
    this.data.totalKills += stats.kills || 0;
    this.data.bossesDefeated += stats.bosses || 0;
    this.addSouls(stats.soulsEarned || 0);

    // Vérification des succès
    if (stats.kills >= 1) this.unlockAchievement('first_blood', 'Premier Sang', 'Éliminer votre premier monstre');
    if (stats.bosses >= 1) this.unlockAchievement('boss_slayer', 'Régicide', 'Terrasser le Souverain Déchu');
    if (stats.floor >= 3) this.unlockAchievement('deep_diver', 'Profondeurs Obscures', 'Atteindre le 3e étage de la crypte');
    if (this.data.lifetimeSouls >= 100) this.unlockAchievement('soul_hoarder', 'Collectionneur d\'Âmes', 'Récolter 100 gemmes d\'âmes');

    this.save();
  }

  unlockAchievement(id, title, desc) {
    if (!this.data.achievements[id]) {
      this.data.achievements[id] = {
        title,
        desc,
        unlockedAt: new Date().toISOString()
      };
      this.save();
      return true;
    }
    return false;
  }

  getSanctuaryBonuses() {
    return {
      damageMultiplier: 1 + META_UPGRADES_CONFIG.forge.calcBonus(this.data.upgrades.forge || 0),
      alchemist: META_UPGRADES_CONFIG.alchemist.calcBonus(this.data.upgrades.alchemist || 0),
      bonusHp: META_UPGRADES_CONFIG.vitality.calcBonus(this.data.upgrades.vitality || 0),
      soulBonus: META_UPGRADES_CONFIG.soulHarvester.calcBonus(this.data.upgrades.soulHarvester || 0)
    };
  }
}

window.StorageManager = StorageManager;
window.META_UPGRADES_CONFIG = META_UPGRADES_CONFIG;
