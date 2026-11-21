/**
 * ============================================================================
 * FORMULAS.JS — CÁLCULOS CRUZADOS V4 SEM INFLAÇÃO QUEBRADA
 * ============================================================================
 */
import { GameConfig } from './config.js';
import { WorldSystems } from './systems.js';
import { AbyssEngine } from './abyss.js';
import { SafeMath } from './utils.js';

export const Formulas = {
  xpToNextLevel(level) {
    const lvl = SafeMath.int(level, 1, 100000);
    const { xpBase, xpExponent } = GameConfig.curves;
    return SafeMath.int(xpBase * Math.pow(lvl, xpExponent), 50);
  },

  statUpgradeCost(currentStatValue, state = null) {
    const val = SafeMath.int(currentStatValue, 1, 1000000);
    const { statCostBase, statCostExponent } = GameConfig.curves;
    const povertyMult = state?.challenges?.active === 'vow_of_poverty' ? 2.0 : 1.0;
    return SafeMath.int(statCostBase * Math.pow(val, statCostExponent) * povertyMult, 10);
  },

  hideoutUpgradeCost(buildingKey, currentLevel, state = null) {
    const cfg = GameConfig.hideoutBuildings[buildingKey];
    const lvl = SafeMath.int(currentLevel, 0, cfg.maxLevel);
    const moon = WorldSystems.getCurrentMoonPhase();
    const povertyMult = state?.challenges?.active === 'vow_of_poverty' ? 2.0 : 1.0;
    return SafeMath.int(cfg.baseCost * Math.pow(cfg.costMult, lvl) * moon.forgeCostMult * povertyMult, 50);
  },

  prestigeUpgradeCost(upgradeKey, currentLevel) {
    const cfg = GameConfig.prestige.upgrades[upgradeKey];
    const lvl = SafeMath.int(currentLevel, 0, cfg.maxLevel);
    return SafeMath.int(cfg.baseCost * Math.pow(cfg.costMult, lvl), 1);
  },

  calculatePrestigeGain(state) {
    const minLvl = GameConfig.prestige.minLevelRequired;
    if (state.level < minLvl) return 0;

    const levelProgress = state.level - minLvl + 1;
    const hideoutSum = (state.hideout.crypt || 0) + (state.hideout.altar || 0) + (state.hideout.bastion || 0);
    const bossBonus = (state.bossesDefeated || 0) * 1.5;
    const abyssBonus = Math.floor((state.abyss?.maxFloor || 1) / 5);
    const eclipseMult = state.challenges?.completed?.eternal_eclipse ? 1.15 : 1.0;

    const rawEssence = (Math.pow(levelProgress, 1.35) * 0.6 + (hideoutSum * 0.25) + bossBonus + abyssBonus) * eclipseMult;
    return SafeMath.int(rawEssence, 1);
  },

  getAchievementMultiplier(lifetimeState = {}) {
    let totalTiers = 0;
    GameConfig.achievements.forEach(ach => {
      const val = lifetimeState[ach.statKey] || 0;
      totalTiers += ach.tiers.filter(t => val >= t).length;
    });
    return 1 + (totalTiers * 0.02); // +2% global por tier conquistado
  },

  getPrestigeMultipliers(state) {
    const upg = (state.prestige && state.prestige.upgrades) || {};
    const pCfg = GameConfig.prestige.upgrades;
    const bestiary = AbyssEngine.getBestiaryBonuses(state.bestiary);
    const achMult = this.getAchievementMultiplier(state.lifetime);
    const completed = state.challenges?.completed || {};

    return {
      combatMult: (1 + (upg.bloodPotency || 0) * pCfg.bloodPotency.bonusPerLevel + bestiary.dmg) * achMult,
      goldMult:   (1 + (upg.darkAvarice  || 0) * pCfg.darkAvarice.bonusPerLevel + bestiary.gold + (completed.vow_of_poverty ? 0.25 : 0)) * achMult,
      xpMult:     (1 + (upg.eternalWisdom|| 0) * pCfg.eternalWisdom.bonusPerLevel + bestiary.xp) * achMult,
      cdReduction:(upg.shadowMastery|| 0) * pCfg.shadowMastery.cdReductionPerLevel,
      dropBonus:  (upg.shadowMastery|| 0) * pCfg.shadowMastery.dropBonusPerLevel,
      bestiary
    };
  },

  // Soma atributos dos equipamentos aplicando nível de aprimoramento da Forja (+1..+20)
  getEquipmentBonuses(state) {
    const totals = { strength: 0, defense: 0, agility: 0, vitality: 0 };
    if (!state.equipment) return totals;

    const isBareHands = state.challenges?.active === 'bare_hands';
    const slots = isBareHands ? ['armor'] : ['weapon', 'armor', 'relic'];

    for (const slot of slots) {
      const item = state.equipment[slot];
      if (item && item.stats) {
        const upgMult = 1 + (item.upgradeLevel || 0) * GameConfig.curves.upgradeStatPerLevel;
        totals.strength += SafeMath.int(item.stats.strength * upgMult, 0);
        totals.defense  += SafeMath.int(item.stats.defense  * upgMult, 0);
        totals.agility  += SafeMath.int(item.stats.agility  * upgMult, 0);
        totals.vitality += SafeMath.int(item.stats.vitality * upgMult, 0);
      }
    }
    return totals;
  },

  getEffectiveStats(state) {
    const f = GameConfig.factions[state.faction] || GameConfig.factions.vampire;
    const eq = this.getEquipmentBonuses(state);
    const pMult = this.getPrestigeMultipliers(state);
    const completed = state.challenges?.completed || {};

    const bastionLvl = SafeMath.int(state.hideout?.bastion, 0);
    const bastionMult = 1 + bastionLvl * GameConfig.hideoutBuildings.bastion.defBonusPerLevel + pMult.bestiary.def;

    const bareHandsBonus = completed.bare_hands ? 1.30 : 1.0;
    const bloodThirstBonus = completed.blood_thirst ? 1.20 : 1.0;

    const defense = SafeMath.int((state.stats.defense + eq.defense) * f.defMult * bastionMult, 1);

    // Runa do Eclipse: converte 15% da Defesa efetiva em Força
    const activeRunes = WorldSystems.getActiveRuneIds(state);
    const eclipseCount = activeRunes.filter(r => r === 'rune_eclipse').length;
    const convertedStr = Math.floor(defense * 0.15 * eclipseCount);

    const strength = SafeMath.int(((state.stats.strength + eq.strength) * f.strMult * pMult.combatMult * bareHandsBonus) + convertedStr, 1);
    const agility  = SafeMath.int((state.stats.agility  + eq.agility)  * f.agiMult, 1);
    const vitality = SafeMath.int((state.stats.vitality + eq.vitality) * f.vitMult * pMult.combatMult * bloodThirstBonus, 1);

    return { strength, defense, agility, vitality };
  },

  getCombatProfile(effStats, level, state = null) {
    const lvl = SafeMath.int(level, 1);
    const maxHp = SafeMath.int(90 + (effStats.vitality * 16) + (lvl * 12), 20);
    const minDmg = SafeMath.int(effStats.strength * 1.45, 3);
    const maxDmg = SafeMath.int(effStats.strength * 2.15, 5);
    const armor = SafeMath.int(effStats.defense * 0.95, 0);

    const bestiaryCrit = state ? AbyssEngine.getBestiaryBonuses(state.bestiary).crit : 0;
    const dodgeChance = Math.min(0.45, Math.max(0, effStats.agility * 0.008));
    const critChance = Math.min(0.55, Math.max(0.05, 0.05 + effStats.agility * 0.009 + bestiaryCrit));

    // Runa da Matilha: +3% dano crítico por seguidor no clã
    const activeRunes = state ? WorldSystems.getActiveRuneIds(state) : [];
    const packRunes = activeRunes.filter(r => r === 'rune_pack').length;
    const followerCount = state?.followers?.length || 0;
    const critDamageMult = 1.65 + (packRunes * followerCount * 0.03);

    return { maxHp, minDmg, maxDmg, armor, dodgeChance, critChance, critDamageMult };
  },

  getWorkHourlyRates(state) {
    const f = GameConfig.factions[state.faction] || GameConfig.factions.vampire;
    const c = GameConfig.curves;
    const pMult = this.getPrestigeMultipliers(state);
    const moon = WorldSystems.getCurrentMoonPhase();
    const altarLvl = SafeMath.int(state.hideout?.altar, 0);
    const altarMult = 1 + altarLvl * GameConfig.hideoutBuildings.altar.bonusPerLevel;
    const eclipsePenalty = state.challenges?.active === 'eternal_eclipse' ? 0.50 : 1.0;

    const baseGold = c.workGoldBasePerHour + (state.level * c.workGoldPerLevel);
    const baseXp = c.workXpBasePerHour + (state.level * c.workXpPerLevel);

    return {
      goldPerHour: SafeMath.int(baseGold * f.goldMult * altarMult * pMult.goldMult * eclipsePenalty, 1),
      xpPerHour: SafeMath.int(baseXp * altarMult * pMult.xpMult * moon.xpMult * eclipsePenalty, 1)
    };
  },

  getPassiveGoldPerHour(state) {
    const cryptLvl = SafeMath.int(state.hideout?.crypt, 0);
    const pMult = this.getPrestigeMultipliers(state);
    return SafeMath.int(cryptLvl * GameConfig.curves.passiveGoldPerSanctumLevel * pMult.goldMult, 0);
  },

  getMaxEnergy(state) {
    return SafeMath.int(GameConfig.curves.energyBaseMax + Math.floor(state.level * 2), 50);
  }
};
