import { GameConfig } from './config.js';
import { Generators } from './generators.js';
import { SafeMath } from './utils.js';
import { CloudSync } from './supabase.js';

export const StateManager = {
  state: null,
  lastCloudSyncAt: null,
  _cloudTimer: null,

  createDefaultState(name = 'Iniciado', faction = 'vampire') {
    const now = Date.now();
    return {
      version: GameConfig.saveVersion,
      created: true,
      updatedAt: now,
      name: String(name || 'Iniciado').trim().slice(0, 18) || 'Iniciado',
      faction: GameConfig.factions[faction] ? faction : 'vampire',
      level: 1,
      xp: 0,
      gold: 120,
      currentHp: 182,
      currentEnergy: GameConfig.curves.energyBaseMax,
      lastTickTime: now,
      lastBossAttempt: 0,
      bossesDefeated: 0,

      stats: { strength: 5, defense: 5, agility: 5, vitality: 5 },
      equipment: { weapon: null, armor: null, relic: null },
      inventory: [],
      runes: [],
      shopStock: Generators.generateShopStock(1),

      materials: { scrap: 15, lunarShards: 0 },
      hideout: { crypt: 0, altar: 0, bastion: 0 },
      followers: [],
      expedition: null,

      abyss: { floor: 1, maxFloor: 1 },
      bestiary: {},
      quests: Generators.generateQuests(1),

      activity: { type: 'idle', startTime: 0, durationSec: 0 },

      prestige: {
        count: 0,
        essence: 0,
        upgrades: {
          bloodPotency: 0,
          darkAvarice: 0,
          eternalWisdom: 0,
          shadowMastery: 0,
          clanExpansion: 0
        }
      },

      challenges: {
        active: null,
        completed: {}
      },

      lifetime: {
        totalKills: 0,
        totalGoldEarned: 120,
        maxAbyssFloor: 1,
        expeditionsCompleted: 0,
        critsLanded: 0
      }
    };
  },

  load() {
    const keys = [GameConfig.storageKey, ...GameConfig.legacyKeys];
    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          this.state = this.migrateAndSanitize(parsed);
          this.save(false);
          return true;
        }
      } catch (e) {
        console.warn('Falha ao ler save:', key, e);
      }
    }
    this.state = this.createDefaultState();
    this.state.created = false;
    return false;
  },

  save(syncCloud = true) {
    if (!this.state) return;
    this.state.updatedAt = Date.now();
    try {
      localStorage.setItem(GameConfig.storageKey, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Falha ao salvar no localStorage:', e);
    }
    if (syncCloud && CloudSync.user && this.state.created) {
      this.scheduleCloudSync();
    }
  },

  scheduleCloudSync() {
    clearTimeout(this._cloudTimer);
    this._cloudTimer = setTimeout(async () => {
      try {
        const ts = await CloudSync.pushSave(this.state);
        if (ts) this.lastCloudSyncAt = ts;
      } catch (e) {
        console.warn('Auto-sync Supabase falhou:', e.message);
      }
    }, 3000);
  },

  migrateAndSanitize(raw) {
    const base = this.createDefaultState(raw?.name, raw?.faction);
    const merged = {
      ...base,
      ...raw,
      version: GameConfig.saveVersion,
      created: raw?.created !== undefined ? Boolean(raw.created) : true,
      updatedAt: Number(raw?.updatedAt) || Date.now(),
      level: SafeMath.int(raw?.level, 1, 100000),
      xp: SafeMath.int(raw?.xp, 0),
      gold: SafeMath.int(raw?.gold, 0),
      currentHp: SafeMath.int(raw?.currentHp, 1),
      currentEnergy: SafeMath.clamp(raw?.currentEnergy ?? 100, 0, 100000),
      lastTickTime: Number(raw?.lastTickTime) || Date.now(),
      lastBossAttempt: SafeMath.int(raw?.lastBossAttempt, 0),
      bossesDefeated: SafeMath.int(raw?.bossesDefeated, 0),
      stats: { ...base.stats, ...(raw?.stats || {}) },
      equipment: { ...base.equipment, ...(raw?.equipment || {}) },
      inventory: Array.isArray(raw?.inventory) ? raw.inventory : [],
      runes: Array.isArray(raw?.runes) ? raw.runes : [],
      shopStock: Array.isArray(raw?.shopStock) && raw.shopStock.length ? raw.shopStock : Generators.generateShopStock(raw?.level || 1),
      materials: { ...base.materials, ...(raw?.materials || {}) },
      hideout: { ...base.hideout, ...(raw?.hideout || {}) },
      followers: Array.isArray(raw?.followers) ? raw.followers : [],
      expedition: raw?.expedition || null,
      abyss: { ...base.abyss, ...(raw?.abyss || {}) },
      bestiary: { ...(raw?.bestiary || {}) },
      quests: Array.isArray(raw?.quests) && raw.quests.length ? raw.quests : Generators.generateQuests(raw?.level || 1),
      activity: { ...base.activity, ...(raw?.activity || {}) },
      prestige: {
        ...base.prestige,
        ...(raw?.prestige || {}),
        upgrades: { ...base.prestige.upgrades, ...(raw?.prestige?.upgrades || {}) }
      },
      challenges: {
        active: raw?.challenges?.active || null,
        completed: { ...(raw?.challenges?.completed || {}) }
      },
      lifetime: { ...base.lifetime, ...(raw?.lifetime || {}) }
    };
    return merged;
  },

  exportBase64() {
    this.save(false);
    const json = JSON.stringify(this.state);
    return btoa(unescape(encodeURIComponent(json)));
  },

  importBase64(b64String) {
    const clean = String(b64String || '').trim();
    if (!clean) throw new Error('Código de save vazio.');
    let parsed;
    try {
      const json = decodeURIComponent(escape(atob(clean)));
      parsed = JSON.parse(json);
    } catch {
      parsed = JSON.parse(clean);
    }
    if (!parsed || typeof parsed !== 'object' || !parsed.stats) {
      throw new Error('Formato de save inválido.');
    }
    this.state = this.migrateAndSanitize(parsed);
    this.save();
  },

  resetAll() {
    [GameConfig.storageKey, ...GameConfig.legacyKeys].forEach(k => localStorage.removeItem(k));
    this.state = this.createDefaultState();
    this.state.created = false;
  }
};