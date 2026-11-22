import { GameConfig } from './config.js';
import { SafeMath } from './utils.js';

const FOLLOWER_NAMES = ['Lucian', 'Vespera', 'Kael', 'Morwen', 'Draven', 'Selene', 'Orlok', 'Nyx'];

export const WorldSystems = {
  getCurrentMoonPhase(nowMs = Date.now()) {
    const phases = GameConfig.moonPhases;
    const sixHoursMs = 24 * 3600 * 1000;
    const idx = Math.floor(nowMs / sixHoursMs) % phases.length;
    return phases[idx];
  },

  getMaxClanSlots(state) {
    const upgSlots = (state.prestige?.upgrades?.clanExpansion || 0) * GameConfig.prestige.upgrades.clanExpansion.slotsPerLevel;
    const eclipseSlot = state.challenges?.completed?.eternal_eclipse ? 1 : 0;
    return GameConfig.curves.baseClanSlots + upgSlots + eclipseSlot;
  },

  getRecruitCost(currentCount) {
    return SafeMath.int(
      GameConfig.curves.recruitBaseGold * Math.pow(GameConfig.curves.recruitGoldMult, currentCount),
      GameConfig.curves.recruitBaseGold
    );
  },

  generateFollower(playerLevel = 1) {
    const classKeys = Object.keys(GameConfig.followerClasses);
    const classId = classKeys[Math.floor(Math.random() * classKeys.length)];
    const cls = GameConfig.followerClasses[classId];
    const name = FOLLOWER_NAMES[Math.floor(Math.random() * FOLLOWER_NAMES.length)];

    const roll = Math.random();
    const rarity = roll < 0.55 ? 'common' : (roll < 0.85 ? 'uncommon' : (roll < 0.96 ? 'rare' : 'epic'));
    const mult = GameConfig.rarities[rarity].mult;

    return {
      uid: `fol_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      classId,
      className: cls.name,
      iconKey: cls.iconKey,
      rarity,
      level: SafeMath.int(playerLevel, 1),
      basePower: SafeMath.int((12 + playerLevel * 3) * mult, 10),
      onExpedition: false
    };
  },

  calculateFollowerPower(follower) {
    const mult = follower.classId === 'brute' ? 1.15 : 1.0;
    return SafeMath.int(follower.basePower * mult, 5);
  },

  calculateSquadPower(followers = []) {
    return followers.reduce((sum, f) => sum + this.calculateFollowerPower(f), 0);
  },

  resolveExpeditionRewards(expedition, squadFollowers, state) {
    const reg = GameConfig.expeditionRegions.find(r => r.id === expedition.regionId) || GameConfig.expeditionRegions[0];
    const hoursMult = (expedition.durationSec / 3600) / 2;
    const power = this.calculateSquadPower(squadFollowers);
    const efficiency = Math.min(2.2, Math.max(0.5, power / Math.max(1, reg.reqPower)));

    const bruteBonus = squadFollowers.some(f => f.classId === 'brute') ? 1.25 : 1.0;
    const occultistBonus = squadFollowers.some(f => f.classId === 'occultist') ? 1.25 : 1.0;
    const scoutBonus = squadFollowers.some(f => f.classId === 'scout') ? 0.15 : 0;

    const scrap = SafeMath.int(reg.baseScrap * hoursMult * efficiency * bruteBonus, 2);
    const lunarShards = SafeMath.int(reg.baseShards * hoursMult * efficiency * occultistBonus, 1);
    const xp = SafeMath.int((25 + state.level * 12) * hoursMult * efficiency * occultistBonus, 10);

    const moon = this.getCurrentMoonPhase();
    const runeChance = Math.min(0.95, (reg.runeChance + scoutBonus) * moon.dropMult);
    let foundRune = null;
    if (Math.random() < runeChance) {
      const tpl = GameConfig.runeCatalog[Math.floor(Math.random() * GameConfig.runeCatalog.length)];
      foundRune = { ...tpl, uid: `rune_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
    }

    return { scrap, lunarShards, xp, foundRune };
  },

  getSalvageValue(item) {
    const rCfg = GameConfig.rarities[item.rarity] || GameConfig.rarities.common;
    const upgBonus = (item.upgradeLevel || 0) * 4;
    return SafeMath.int(rCfg.scrapYield + upgBonus, 2);
  },

  getItemOriginalPrice(item) {
    if (!item) return 0;
    if (typeof item.price === 'number' && item.price > 0) {
      return SafeMath.int(item.price, 1);
    }
    const rCfg = GameConfig.rarities[item.rarity] || GameConfig.rarities.common;
    const lvl = Math.max(1, SafeMath.int(item.level || 1, 1));
    const upg = Math.max(0, SafeMath.int(item.upgradeLevel || 0, 0));
    const baseVal = (25 + lvl * 18) * (rCfg.mult || 1) * (1 + upg * 0.25);
    return SafeMath.int(baseVal, 10);
  },

  getItemSellValue(item) {
    if (!item) return 0;
    const original = this.getItemOriginalPrice(item);
    return Math.max(1, Math.floor(original * 0.5));
  },

  getItemEffectiveStats(item) {
    const totals = { strength: 0, defense: 0, agility: 0, vitality: 0 };
    if (!item || !item.stats) return totals;
    const upgMult = 1 + ((item.upgradeLevel || 0) * 0.15);
    Object.keys(totals).forEach(k => {
      const baseStat = item.stats[k] || 0;
      totals[k] = baseStat > 0 ? SafeMath.int(baseStat * upgMult, 1) : 0;
    });
    return totals;
  },

  compareItemWithEquipped(candidateItem, equippedItem) {
    const statKeys = ['strength', 'defense', 'agility', 'vitality'];
    const candStats = this.getItemEffectiveStats(candidateItem);
    const eqStats = equippedItem ? this.getItemEffectiveStats(equippedItem) : { strength: 0, defense: 0, agility: 0, vitality: 0 };

    const deltas = {};
    let totalScoreDelta = 0;

    statKeys.forEach(k => {
      const diff = candStats[k] - eqStats[k];
      deltas[k] = diff;
      totalScoreDelta += diff;
    });

    return {
      hasEquipped: Boolean(equippedItem),
      equippedItem,
      deltas,
      totalScoreDelta
    };
  },

  getForgeUpgradeCost(item, state) {
    const lvl = item.upgradeLevel || 0;
    const moon = this.getCurrentMoonPhase();
    const povertyBonus = state?.challenges?.completed?.vow_of_poverty ? 0.90 : 1.0;
    const mult = Math.pow(GameConfig.curves.upgradeScrapMult, lvl) * moon.forgeCostMult * povertyBonus;

    return {
      scrap: SafeMath.int(GameConfig.curves.upgradeBaseScrap * mult, 5),
      gold: SafeMath.int((40 + (item.level || 1) * 15) * mult, 20)
    };
  },

  getItemRuneSlots(item, state) {
    const rCfg = GameConfig.rarities[item.rarity] || GameConfig.rarities.common;
    let slots = rCfg.runeSlots || 0;
    if (item.rarity === 'epic' && state?.challenges?.completed?.bare_hands) {
      slots += 1;
    }
    return slots;
  },

  getActiveRuneIds(state) {
    if (!state?.equipment) return [];
    const ids = [];
    for (const slot of ['weapon', 'armor', 'relic']) {
      const item = state.equipment[slot];
      if (item?.runes?.length) {
        ids.push(...item.runes);
      }
    }
    return ids;
  }
};
