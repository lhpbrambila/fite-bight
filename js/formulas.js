/**
 * ============================================================================
 * FORMULAS.JS — CÁLCULOS PUROS COM BÔNUS DE PRESTÍGIO E PROTEÇÃO NUMÉRICA
 * ============================================================================
 */
import { GameConfig } from './config.js';
import { SafeMath } from './utils.js';

export const Formulas = {
  xpToNextLevel(level) {
    const lvl = SafeMath.int(level, 1, 10000);
    const { xpBase, xpExponent } = GameConfig.curves;
    return SafeMath.int(xpBase * Math.pow(lvl, xpExponent), 50);
  },

  statUpgradeCost(currentStatValue) {
    const val = SafeMath.int(currentStatValue, 1, 100000);
    const { statCostBase, statCostExponent } = GameConfig.curves;
    return SafeMath.int(statCostBase * Math.pow(val, statCostExponent), 10);
  },

  hideoutUpgradeCost(buildingKey, currentLevel) {
    const cfg = GameConfig.hideoutBuildings[buildingKey];
    const lvl = SafeMath.int(currentLevel, 0, cfg.maxLevel);
    return SafeMath.int(cfg.baseCost * Math.pow(cfg.costMult, lvl), 50);
  },

  prestigeUpgradeCost(upgradeKey, currentLevel) {
    const cfg = GameConfig.prestige.upgrades[upgradeKey];
    const lvl = SafeMath.int(currentLevel, 0, cfg.maxLevel);
    return SafeMath.int(cfg.baseCost * Math.pow(cfg.costMult, lvl), 1);
  },

  // Calcula quantas Essências Ancestrais o jogador ganhará ao renascer agora
  calculatePrestigeGain(state) {
    const minLvl = GameConfig.prestige.minLevelRequired;
    if (state.level < minLvl) return 0;

    const levelProgress = state.level - minLvl + 1;
    const hideoutSum = (state.hideout.crypt || 0) + (state.hideout.altar || 0) + (state.hideout.bastion || 0);
    const bossBonus = (state.bossesDefeated || 0) * 1.5;

    const rawEssence = Math.pow(levelProgress, 1.35) * 0.6 + (hideoutSum * 0.25) + bossBonus;
    return SafeMath.int(rawEssence, 1);
  },

  getPrestigeMultipliers(prestigeState) {
    const upg = (prestigeState && prestigeState.upgrades) || {};
    const pCfg = GameConfig.prestige.upgrades;

    return {
      combatMult: 1 + (upg.bloodPotency || 0) * pCfg.bloodPotency.bonusPerLevel,
      goldMult:   1 + (upg.darkAvarice  || 0) * pCfg.darkAvarice.bonusPerLevel,
      xpMult:     1 + (upg.eternalWisdom|| 0) * pCfg.eternalWisdom.bonusPerLevel,
      cdReduction:(upg.shadowMastery|| 0) * pCfg.shadowMastery.cdReductionPerLevel,
      dropBonus:  (upg.shadowMastery|| 0) * pCfg.shadowMastery.dropBonusPerLevel
    };
  },

  getEquipmentBonuses(equipment) {
    const totals = { strength: 0, defense: 0, agility: 0, vitality: 0 };
    if (!equipment) return totals;
    for (const slot of ['weapon', 'armor', 'relic']) {
      const item = equipment[slot];
      if (item && item.stats) {
        totals.strength += SafeMath.int(item.stats.strength, 0);
        totals.defense  += SafeMath.int(item.stats.defense, 0);
        totals.agility  += SafeMath.int(item.stats.agility, 0);
        totals.vitality += SafeMath.int(item.stats.vitality, 0);
      }
    }
    return totals;
  },

  getEffectiveStats(state) {
    const f = GameConfig.factions[state.faction] || GameConfig.factions.vampire;
    const eq = this.getEquipmentBonuses(state.equipment);
    const pMult = this.getPrestigeMultipliers(state.prestige);
    const bastionLvl = SafeMath.int(state.hideout?.bastion, 0);
    const bastionMult = 1 + bastionLvl * GameConfig.hideoutBuildings.bastion.defBonusPerLevel;

    return {
      strength: SafeMath.int((state.stats.strength + eq.strength) * f.strMult * pMult.combatMult, 1),
      defense:  SafeMath.int((state.stats.defense  + eq.defense)  * f.defMult * bastionMult, 1),
      agility:  SafeMath.int((state.stats.agility  + eq.agility)  * f.agiMult, 1),
      vitality: SafeMath.int((state.stats.vitality + eq.vitality) * f.vitMult * pMult.combatMult, 1)
    };
  },

  getCombatProfile(effStats, level) {
    const lvl = SafeMath.int(level, 1);
    const maxHp = SafeMath.int(90 + (effStats.vitality * 16) + (lvl * 12), 20);
    const minDmg = SafeMath.int(effStats.strength * 1.45, 3);
    const maxDmg = SafeMath.int(effStats.strength * 2.15, 5);
    const armor = SafeMath.int(effStats.defense * 0.95, 0);
    const dodgeChance = Math.min(0.42, Math.max(0, effStats.agility * 0.008));
    const critChance = Math.min(0.45, Math.max(0.05, 0.05 + effStats.agility * 0.009));

    return { maxHp, minDmg, maxDmg, armor, dodgeChance, critChance };
  },

  getWorkHourlyRates(state) {
    const f = GameConfig.factions[state.faction] || GameConfig.factions.vampire;
    const c = GameConfig.curves;
    const pMult = this.getPrestigeMultipliers(state.prestige);
    const altarLvl = SafeMath.int(state.hideout?.altar, 0);
    const altarMult = 1 + altarLvl * GameConfig.hideoutBuildings.altar.bonusPerLevel;

    const baseGold = c.workGoldBasePerHour + (state.level * c.workGoldPerLevel);
    const baseXp = c.workXpBasePerHour + (state.level * c.workXpPerLevel);

    return {
      goldPerHour: SafeMath.int(baseGold * f.goldMult * altarMult * pMult.goldMult, 1),
      xpPerHour: SafeMath.int(baseXp * altarMult * pMult.xpMult, 1)
    };
  },

  getPassiveGoldPerHour(state) {
    const cryptLvl = SafeMath.int(state.hideout?.crypt, 0);
    const pMult = this.getPrestigeMultipliers(state.prestige);
    return SafeMath.int(cryptLvl * GameConfig.curves.passiveGoldPerSanctumLevel * pMult.goldMult, 0);
  },

  getMaxEnergy(state) {
    return SafeMath.int(GameConfig.curves.energyBaseMax + Math.floor(state.level * 2), 50);
  }
};
