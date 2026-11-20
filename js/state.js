/**
 * ============================================================================
 * STATE.JS — ESTADO, MIGRAÇÃO V1/V2->V3, PRESTÍGIO E SANITIZAÇÃO
 * ============================================================================
 */
import { GameConfig } from './config.js';
import { Formulas } from './formulas.js';
import { Generators } from './generators.js';
import { SafeMath } from './utils.js';

export function createDefaultState() {
  return {
    version: GameConfig.saveVersion,
    initialized: false,
    name: 'Iniciado',
    faction: 'vampire',
    level: 1,
    xp: 0,
    gold: 80,
    currentHp: 182,
    currentEnergy: 100,

    stats: { strength: 5, defense: 5, agility: 5, vitality: 5 },
    equipment: { weapon: null, armor: null, relic: null },
    inventory: [],
    shopStock: [],
    hideout: { crypt: 0, altar: 0, bastion: 0 },

    // Novos sistemas V3
    prestige: {
      count: 0,
      essence: 0,
      upgrades: {
        bloodPotency: 0,
        darkAvarice: 0,
        eternalWisdom: 0,
        shadowMastery: 0
      }
    },
    bossesDefeated: 0,
    lastBossAttempt: 0,
    quests: [],

    activity: { type: 'idle', startTime: null, durationSec: 0 },
    lastTimestamp: Date.now()
  };
}

export const StateManager = {
  state: createDefaultState(),

  // Sanitiza qualquer estado carregado ou importado contra NaN/negativos
  sanitizeState(s) {
    s.level = SafeMath.int(s.level, 1, 10000);
    s.xp = SafeMath.int(s.xp, 0);
    s.gold = SafeMath.int(s.gold, 0);
    s.bossesDefeated = SafeMath.int(s.bossesDefeated, 0);
    s.lastBossAttempt = SafeMath.int(s.lastBossAttempt, 0);

    for (const k of ['strength', 'defense', 'agility', 'vitality']) {
      s.stats[k] = SafeMath.int(s.stats[k], 1, 1000000);
    }

    s.prestige.count = SafeMath.int(s.prestige.count, 0);
    s.prestige.essence = SafeMath.int(s.prestige.essence, 0);

    const eff = Formulas.getEffectiveStats(s);
    const maxHp = Formulas.getCombatProfile(eff, s.level).maxHp;
    const maxEnergy = Formulas.getMaxEnergy(s);

    s.currentHp = SafeMath.clamp(s.currentHp, 1, maxHp);
    s.currentEnergy = SafeMath.clamp(s.currentEnergy, 0, maxEnergy);
    return s;
  },

  save() {
    this.sanitizeState(this.state);
    const now = Date.now();
    if (now >= this.state.lastTimestamp) {
      this.state.lastTimestamp = now;
    }
    try {
      localStorage.setItem(GameConfig.storageKey, JSON.stringify(this.state));
    } catch (e) {
      console.error('Erro ao salvar:', e);
    }
  },

  load() {
    try {
      const rawV3 = localStorage.getItem(GameConfig.storageKey);
      if (rawV3) {
        const parsed = JSON.parse(rawV3);
        if (parsed && parsed.initialized) {
          this.state = this.migrateSave(parsed);
          return { loaded: true, migrated: false };
        }
      }
    } catch (e) {
      console.error('Erro ao ler save v3:', e);
    }

    for (const oldKey of GameConfig.legacyKeys) {
      try {
        const rawOld = localStorage.getItem(oldKey);
        if (rawOld) {
          const parsedOld = JSON.parse(rawOld);
          if (parsedOld && parsedOld.initialized) {
            this.state = this.migrateSave(parsedOld);
            this.save();
            return { loaded: true, migrated: true };
          }
        }
      } catch (e) {
        console.error(`Erro ao migrar ${oldKey}:`, e);
      }
    }

    return { loaded: false, migrated: false };
  },

  migrateSave(rawObj) {
    const base = createDefaultState();
    const merged = {
      ...base,
      ...rawObj,
      version: GameConfig.saveVersion,
      stats: { ...base.stats, ...(rawObj.stats || {}) },
      equipment: { ...base.equipment, ...(rawObj.equipment || {}) },
      hideout: { ...base.hideout, ...(rawObj.hideout || {}) },
      prestige: {
        ...base.prestige,
        ...(rawObj.prestige || {}),
        upgrades: { ...base.prestige.upgrades, ...(rawObj.prestige?.upgrades || {}) }
      },
      activity: { ...base.activity, ...(rawObj.activity || {}) },
      inventory: Array.isArray(rawObj.inventory) ? rawObj.inventory : [],
      shopStock: Array.isArray(rawObj.shopStock) && rawObj.shopStock.length > 0
        ? rawObj.shopStock
        : Generators.generateShopStock(rawObj.level || 1),
      quests: Array.isArray(rawObj.quests) && rawObj.quests.length > 0
        ? rawObj.quests
        : Generators.generateQuestSet(rawObj)
    };

    return this.sanitizeState(merged);
  },

  processOfflineProgress(calculateWorkFn) {
    const now = Date.now();
    const deltaMs = now - this.state.lastTimestamp;

    if (deltaMs < -5000) {
      return {
        clockTampered: true,
        message: '⚠️ Retrocesso no relógio do sistema detectado. Ganhos offline foram bloqueados nesta sessão.'
      };
    }

    const elapsedSec = Math.max(0, Math.floor(deltaMs / 1000));
    const cappedSec = Math.min(elapsedSec, GameConfig.maxOfflineSeconds);
    this.state.lastTimestamp = now;

    if (cappedSec < 30) return null;

    const elapsedMin = cappedSec / 60;
    const effStats = Formulas.getEffectiveStats(this.state);
    const maxHp = Formulas.getCombatProfile(effStats, this.state.level).maxHp;
    const maxEnergy = Formulas.getMaxEnergy(this.state);

    const bastionBonus = 1 + (this.state.hideout.bastion || 0) * 0.05;
    const hpRecovered = Math.floor(maxHp * GameConfig.curves.hpRegenPctPerMin * bastionBonus * elapsedMin);
    const energyRecovered = Math.floor(GameConfig.curves.energyRegenPerMin * elapsedMin);

    this.state.currentHp = Math.min(maxHp, this.state.currentHp + hpRecovered);
    this.state.currentEnergy = Math.min(maxEnergy, this.state.currentEnergy + energyRecovered);

    const passiveRate = Formulas.getPassiveGoldPerHour(this.state);
    const passiveGold = Math.floor((cappedSec / 3600) * passiveRate);
    this.state.gold += passiveGold;

    let workSummary = '';
    if (this.state.activity.type === 'working') {
      const calc = calculateWorkFn(now);
      workSummary = `<br>• Trabalho acumulado: <strong style="color:var(--gold)">+${SafeMath.formatNumber(calc.gold)} Ouro</strong> e <strong style="color:var(--xp)">+${SafeMath.formatNumber(calc.xp)} XP</strong>`;
    }

    const hours = Math.floor(cappedSec / 3600);
    const mins = Math.floor((cappedSec % 3600) / 60);
    const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    let details = `Tempo ausente: <strong>${timeStr}</strong><br>`;
    if (passiveGold > 0) details += `<br>• Cripta (Passivo): <strong style="color:var(--gold)">+${SafeMath.formatNumber(passiveGold)} Ouro</strong>`;
    if (energyRecovered > 0 || hpRecovered > 0) {
      details += `<br>• Recuperação: <strong style="color:var(--hp)">+${hpRecovered} HP</strong> | <strong style="color:var(--energy)">+${energyRecovered} Energia</strong>`;
    }
    details += workSummary;

    return { clockTampered: false, message: details };
  },

  exportBase64() {
    this.save();
    return btoa(unescape(encodeURIComponent(JSON.stringify(this.state))));
  },

  importBase64(encodedStr) {
    const clean = encodedStr.trim();
    if (!clean) throw new Error('Código vazio.');
    const jsonStr = clean.startsWith('{') ? clean : decodeURIComponent(escape(atob(clean)));
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object' || !parsed.stats || !parsed.faction) {
      throw new Error('Save inválido.');
    }
    this.state = this.migrateSave(parsed);
    this.state.initialized = true;
    this.state.lastTimestamp = Date.now();
    this.save();
  }
};
