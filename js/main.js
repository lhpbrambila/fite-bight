/**
 * ============================================================================
 * MAIN.JS — ORQUESTRADOR V3 (PRESTÍGIO, CHEFES, MISSÕES, HABILIDADES E TESTES)
 * ============================================================================
 */
import { GameConfig } from './config.js';
import { Formulas } from './formulas.js';
import { Generators } from './generators.js';
import { StateManager, createDefaultState } from './state.js';
import { CombatEngine } from './combat.js';
import { SelfTests } from './tests.js';
import { SafeMath } from './utils.js';
import { UI } from './ui.js';

const App = {
  huntTargets: [],
  currentBoss: null,
  lastTickMs: Date.now(),

  init() {
    this.registerServiceWorker();

    const callbacks = {
      onCreateChar: (faction) => this.createCharacter(faction),
      onUpgradeStat: (key) => this.upgradeStat(key),
      onStartWork: (hours) => this.startWork(hours),
      onClaimWork: () => this.claimWork(),
      onUpgradeHideout: (id) => this.upgradeHideout(id),
      onRefreshTargets: () => this.refreshTargets(),
      onHuntTarget: (target) => this.huntTarget(target),
      onAutoHunt: () => this.autoHunt(),
      onFightBoss: () => this.fightBoss(),
      onClaimQuest: (idx) => this.claimQuest(idx),
      onAwaken: () => this.performAwakening(),
      onBuyPrestigeUpgrade: (id) => this.buyPrestigeUpgrade(id),
      onBuyItem: (idx) => this.buyItem(idx),
      onEquipItem: (idx) => this.equipItem(idx),
      onSellItem: (idx) => this.sellItem(idx),
      onUseConsumable: (idx) => this.useConsumable(idx),
      onRefreshShop: () => this.refreshShop(true),
      onAfterImport: () => this.onStateLoaded(false),
      onRunTests: () => this.runDiagnostics(),
      onResetGame: () => this.resetGame()
    };

    // Adiciona listener para Prestígio upgrades no UI
    this._callbacks = callbacks;
    UI.bindGlobalEvents(callbacks);

    const { loaded, migrated } = StateManager.load();
    if (!loaded || !StateManager.state.initialized) {
      document.getElementById('faction-screen').classList.remove('hidden');
      return;
    }

    this.onStateLoaded(migrated);
    this.startLoops(callbacks);
  },

  registerServiceWorker() {
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  },

  onStateLoaded(wasMigrated) {
    document.getElementById('faction-screen').classList.add('hidden');
    UI.applyFactionTheme(StateManager.state.faction);

    const offlineReport = StateManager.processOfflineProgress((now) => this.calculateWorkAccrued(now));
    if (offlineReport) {
      UI.showOfflineModal(offlineReport.message);
    } else if (wasMigrated) {
      UI.showToast('Save anterior migrado para v3!');
    }

    if (StateManager.state.quests.length === 0) {
      StateManager.state.quests = Generators.generateQuestSet(StateManager.state);
    }

    this.huntTargets = Generators.generateHuntTargets(StateManager.state.level, StateManager.state.faction);
    this.currentBoss = Generators.generateBoss(StateManager.state.level, StateManager.state.bossesDefeated);
    this.render();
  },

  startLoops(callbacks) {
    this._callbacks = callbacks;
    this.lastTickMs = Date.now();

    setInterval(() => {
      const now = Date.now();
      const dtSec = Math.max(0, (now - this.lastTickMs) / 1000);
      this.lastTickMs = now;

      this.processOnlineRegen(dtSec);
      UI.updateWorkPanel((t) => this.calculateWorkAccrued(t));
    }, 1000);

    setInterval(() => StateManager.save(), 15000);
  },

  render() {
    UI.renderAll(this._callbacks, this.huntTargets, this.currentBoss, (t) => this.calculateWorkAccrued(t));
  },

  createCharacter(factionId) {
    const rawName = document.getElementById('player-name-input').value.trim();
    const s = createDefaultState();
    s.initialized = true;
    s.name = rawName || (factionId === 'vampire' ? 'Lorde Carmesim' : 'Presa Lunar');
    s.faction = factionId;

    const eff = Formulas.getEffectiveStats(s);
    s.currentHp = Formulas.getCombatProfile(eff, 1).maxHp;
    s.currentEnergy = Formulas.getMaxEnergy(s);
    s.shopStock = Generators.generateShopStock(1);
    s.quests = Generators.generateQuestSet(s);

    StateManager.state = s;
    StateManager.save();

    document.getElementById('faction-screen').classList.add('hidden');
    UI.applyFactionTheme(factionId);
    this.huntTargets = Generators.generateHuntTargets(1, factionId);
    this.currentBoss = Generators.generateBoss(1, 0);
    this.startLoops(this._callbacks);
    this.render();
  },

  trackQuestProgress(type, amount) {
    if (amount <= 0) return;
    StateManager.state.quests.forEach(q => {
      if (q.type === type && q.progress < q.target) {
        q.progress = Math.min(q.target, q.progress + amount);
      }
    });
  },

  grantGold(amount) {
    const clean = SafeMath.int(amount, 0);
    if (clean <= 0) return;
    StateManager.state.gold += clean;
    this.trackQuestProgress('gold_earned', clean);
  },

  addXp(amount) {
    const s = StateManager.state;
    s.xp += SafeMath.int(amount, 0);
    let leveled = false;
    while (s.xp >= Formulas.xpToNextLevel(s.level)) {
      s.xp -= Formulas.xpToNextLevel(s.level);
      s.level += 1;
      leveled = true;
    }
    if (leveled) {
      const eff = Formulas.getEffectiveStats(s);
      s.currentHp = Formulas.getCombatProfile(eff, s.level).maxHp;
      s.currentEnergy = Formulas.getMaxEnergy(s);
      s.shopStock = Generators.generateShopStock(s.level);
      this.currentBoss = Generators.generateBoss(s.level, s.bossesDefeated);
      UI.triggerPulse('ui-avatar');
      UI.showToast(`🎉 Nível ${s.level} alcançado!`);
    }
  },

  processOnlineRegen(dtSec) {
    const s = StateManager.state;
    if (!s.initialized) return;

    const dtMin = dtSec / 60;
    const eff = Formulas.getEffectiveStats(s);
    const maxHp = Formulas.getCombatProfile(eff, s.level).maxHp;
    const maxEnergy = Formulas.getMaxEnergy(s);
    const bastionBonus = 1 + (s.hideout.bastion || 0) * 0.05;

    let changed = false;
    if (s.currentHp < maxHp) {
      s.currentHp = Math.min(maxHp, s.currentHp + (maxHp * GameConfig.curves.hpRegenPctPerMin * bastionBonus * dtMin));
      changed = true;
    }
    if (s.currentEnergy < maxEnergy) {
      s.currentEnergy = Math.min(maxEnergy, s.currentEnergy + (GameConfig.curves.energyRegenPerMin * dtMin));
      changed = true;
    }

    const passivePerHr = Formulas.getPassiveGoldPerHour(s);
    if (passivePerHr > 0) {
      this._passiveGoldBuffer = (this._passiveGoldBuffer || 0) + (passivePerHr / 3600) * dtSec;
      if (this._passiveGoldBuffer >= 1) {
        const whole = Math.floor(this._passiveGoldBuffer);
        this.grantGold(whole);
        this._passiveGoldBuffer -= whole;
        changed = true;
      }
    }

    if (changed) {
      document.getElementById('ui-gold').textContent = SafeMath.formatNumber(s.gold);
      document.getElementById('ui-hp').textContent = `${SafeMath.formatNumber(s.currentHp)}/${SafeMath.formatNumber(maxHp)}`;
      document.getElementById('ui-energy').textContent = `${Math.floor(s.currentEnergy)}/${maxEnergy}`;
    }
  },

  upgradeStat(key) {
    const s = StateManager.state;
    if (s.activity.type !== 'idle') {
      UI.showToast('Encerre o trabalho antes de treinar!');
      return;
    }
    const cost = Formulas.statUpgradeCost(s.stats[key]);
    if (s.gold < cost) return;

    s.gold -= cost;
    s.stats[key] += 1;
    this.trackQuestProgress('stat_upgrades', 1);

    if (key === 'vitality') {
      const eff = Formulas.getEffectiveStats(s);
      s.currentHp = Formulas.getCombatProfile(eff, s.level).maxHp;
    }
    StateManager.save();
    this.render();
  },

  // --- TRABALHO ---
  startWork(hours) {
    const s = StateManager.state;
    if (s.activity.type !== 'idle') return;
    s.activity = { type: 'working', startTime: Date.now(), durationSec: hours * 3600 };
    StateManager.save();
    this.render();
  },

  calculateWorkAccrued(nowMs = Date.now()) {
    const s = StateManager.state;
    if (s.activity.type !== 'working' || !s.activity.startTime) {
      return { elapsedSec: 0, effectiveSec: 0, gold: 0, xp: 0, progressPct: 0, isFinished: false };
    }
    const rawElapsed = Math.max(0, Math.floor((nowMs - s.activity.startTime) / 1000));
    const maxCap = s.activity.durationSec > 0
      ? Math.min(s.activity.durationSec, GameConfig.maxOfflineSeconds)
      : GameConfig.maxOfflineSeconds;

    const effectiveSec = Math.min(rawElapsed, maxCap);
    const rates = Formulas.getWorkHourlyRates(s);

    return {
      elapsedSec: rawElapsed,
      effectiveSec,
      gold: Math.floor((effectiveSec / 3600) * rates.goldPerHour),
      xp: Math.floor((effectiveSec / 3600) * rates.xpPerHour),
      isFinished: s.activity.durationSec > 0 && rawElapsed >= s.activity.durationSec,
      progressPct: s.activity.durationSec > 0
        ? Math.min(100, (rawElapsed / s.activity.durationSec) * 100)
        : Math.min(100, (effectiveSec / GameConfig.maxOfflineSeconds) * 100)
    };
  },

  claimWork() {
    const s = StateManager.state;
    if (s.activity.type !== 'working') return;
    const accrued = this.calculateWorkAccrued(Date.now());
    this.grantGold(accrued.gold);
    this.addXp(accrued.xp);
    if (accrued.effectiveSec >= 60) {
      this.trackQuestProgress('work_claims', 1);
    }
    s.activity = { type: 'idle', startTime: null, durationSec: 0 };
    StateManager.save();
    this.render();
    UI.showToast(`Coletado: +${SafeMath.formatNumber(accrued.gold)} Ouro e +${SafeMath.formatNumber(accrued.xp)} XP!`);
  },

  // --- ESCONDERIJO ---
  upgradeHideout(buildingId) {
    const s = StateManager.state;
    const cfg = GameConfig.hideoutBuildings[buildingId];
    const lvl = s.hideout[buildingId] || 0;
    if (lvl >= cfg.maxLevel) return;

    const cost = Formulas.hideoutUpgradeCost(buildingId, lvl);
    if (s.gold < cost) return;

    s.gold -= cost;
    s.hideout[buildingId] = lvl + 1;
    StateManager.save();
    this.render();
    UI.showToast(`${cfg.name} Nível ${lvl + 1}!`);
  },

  // --- CAÇADA, CHEFES E MISSÕES ---
  refreshTargets() {
    this.huntTargets = Generators.generateHuntTargets(StateManager.state.level, StateManager.state.faction);
    this.render();
  },

  huntTarget(target) {
    const s = StateManager.state;
    const cost = GameConfig.curves.huntEnergyCost;
    if (s.activity.type !== 'idle') return UI.showToast('Encerre o trabalho antes de caçar!');
    if (s.currentEnergy < cost) return UI.showToast('Energia insuficiente!');
    if (s.currentHp <= 5) return UI.showToast('HP muito baixo!');

    s.currentEnergy -= cost;
    const result = CombatEngine.simulateBattle(s, target);

    s.currentHp = result.remainingHp;
    this.grantGold(result.rewardGold);
    this.addXp(result.rewardXp);
    if (result.won) this.trackQuestProgress('wins', 1);
    if (result.droppedItem) s.inventory.push(result.droppedItem);

    this.huntTargets = Generators.generateHuntTargets(s.level, s.faction);
    StateManager.save();
    this.render();
    UI.renderCombatLog(result.logs);
  },

  autoHunt() {
    const s = StateManager.state;
    const cost = GameConfig.curves.huntEnergyCost;
    if (s.activity.type !== 'idle') return UI.showToast('Encerre o trabalho antes de caçar!');
    if (s.currentEnergy < cost) return UI.showToast('Energia insuficiente!');

    const maxRuns = Math.min(GameConfig.curves.autoHuntMaxRuns, Math.floor(s.currentEnergy / cost));
    const summaryLogs = [`⚡ <strong>Auto-Caçada (${maxRuns} incursões)...</strong>`];
    let totalGold = 0, totalXp = 0, wins = 0, drops = 0;

    for (let i = 0; i < maxRuns; i++) {
      if (s.currentHp <= 10 || s.currentEnergy < cost) break;
      const chosen = Generators.generateHuntTargets(s.level, s.faction)[1];
      s.currentEnergy -= cost;

      const res = CombatEngine.simulateBattle(s, chosen);
      s.currentHp = res.remainingHp;
      this.grantGold(res.rewardGold);
      this.addXp(res.rewardXp);

      totalGold += res.rewardGold;
      totalXp += res.rewardXp;
      if (res.won) {
        wins++;
        this.trackQuestProgress('wins', 1);
      }
      if (res.droppedItem) {
        s.inventory.push(res.droppedItem);
        drops++;
      }
      summaryLogs.push(`#${i + 1} vs ${chosen.name}: ${res.won ? '✅ Vitória' : '❌ Derrota'} (+${res.rewardGold} 🪙)`);
    }

    summaryLogs.push(`<span class="log-win">Resumo: ${wins}/${maxRuns} vitórias • +${SafeMath.formatNumber(totalGold)} Ouro • +${SafeMath.formatNumber(totalXp)} XP • ${drops} drop(s).</span>`);
    this.huntTargets = Generators.generateHuntTargets(s.level, s.faction);
    StateManager.save();
    this.render();
    UI.renderCombatLog(summaryLogs);
  },

  fightBoss() {
    const s = StateManager.state;
    const cost = GameConfig.curves.bossEnergyCost;
    const nowSec = Math.floor(Date.now() / 1000);
    if (s.activity.type !== 'idle') return UI.showToast('Encerre o trabalho antes!');
    if (nowSec < s.lastBossAttempt + GameConfig.curves.bossCooldownSec) return UI.showToast('Chefe em recarga!');
    if (s.currentEnergy < cost) return UI.showToast('Energia insuficiente!');

    s.currentEnergy -= cost;
    s.lastBossAttempt = nowSec;

    const result = CombatEngine.simulateBattle(s, this.currentBoss);
    s.currentHp = result.remainingHp;
    this.grantGold(result.rewardGold);
    this.addXp(result.rewardXp);
    if (result.droppedItem) s.inventory.push(result.droppedItem);

    if (result.won) {
      s.bossesDefeated += 1;
      s.prestige.essence += 1;
      result.logs.push(`<span class="log-drop">✨ Bônus de Chefe: +1 Essência Ancestral permanente!</span>`);
      this.currentBoss = Generators.generateBoss(s.level, s.bossesDefeated);
    }

    StateManager.save();
    this.render();
    UI.renderCombatLog(result.logs);
  },

  claimQuest(idx) {
    const s = StateManager.state;
    const q = s.quests[idx];
    if (!q || q.progress < q.target) return;

    this.grantGold(q.rewardGold);
    this.addXp(q.rewardXp);
    if (q.rewardEssence > 0) s.prestige.essence += q.rewardEssence;

    // Substitui a missão concluída por uma nova
    const replacement = Generators.generateQuestSet(s)[0];
    s.quests[idx] = replacement;

    StateManager.save();
    this.render();
    UI.showToast(`Missão concluída! +${SafeMath.formatNumber(q.rewardGold)} Ouro!`);
  },

  // --- PRESTÍGIO ("DESPERTAR ANCESTRAL") ---
  performAwakening() {
    const s = StateManager.state;
    if (s.level < GameConfig.prestige.minLevelRequired) return;

    const gain = Formulas.calculatePrestigeGain(s);
    if (!confirm(`Despertar Ancestral reiniciará seu Nível, Ouro, Atributos, Itens e Esconderijo em troca de +${gain} Essências Ancestrais permanentes. Continuar?`)) {
      return;
    }

    s.prestige.count += 1;
    s.prestige.essence += gain;

    // Reinicia progresso mortal mantendo facção, nome, chefes e melhorias de prestígio
    s.level = 1;
    s.xp = 0;
    s.gold = GameConfig.prestige.startingGoldPerAwakening * s.prestige.count;
    s.stats = { strength: 5, defense: 5, agility: 5, vitality: 5 };
    s.equipment = { weapon: null, armor: null, relic: null };
    s.inventory = [];
    s.hideout = { crypt: 0, altar: 0, bastion: 0 };
    s.activity = { type: 'idle', startTime: null, durationSec: 0 };

    const eff = Formulas.getEffectiveStats(s);
    s.currentHp = Formulas.getCombatProfile(eff, 1).maxHp;
    s.currentEnergy = Formulas.getMaxEnergy(s);
    s.shopStock = Generators.generateShopStock(1);
    s.quests = Generators.generateQuestSet(s);

    this.huntTargets = Generators.generateHuntTargets(1, s.faction);
    this.currentBoss = Generators.generateBoss(1, s.bossesDefeated);

    StateManager.save();
    this.render();
    UI.triggerPulse('ui-avatar');
    UI.showToast(`✨ Despertar concluído! +${gain} Essências Ancestrais!`);
  },

  buyPrestigeUpgrade(upgradeId) {
    const s = StateManager.state;
    const cfg = GameConfig.prestige.upgrades[upgradeId];
    const lvl = s.prestige.upgrades[upgradeId] || 0;
    if (lvl >= cfg.maxLevel) return;

    const cost = Formulas.prestigeUpgradeCost(upgradeId, lvl);
    if (s.prestige.essence < cost) return;

    s.prestige.essence -= cost;
    s.prestige.upgrades[upgradeId] = lvl + 1;

    StateManager.save();
    this.render();
    UI.showToast(`${cfg.name} evoluído para Nível ${lvl + 1}!`);
  },

  // --- LOJA & INVENTÁRIO ---
  buyItem(shopIdx) {
    const s = StateManager.state;
    const item = s.shopStock[shopIdx];
    if (!item || s.gold < item.price) return;

    s.gold -= item.price;
    if (item.type === 'consumable') {
      s.inventory.push({ ...item, uid: `cons_${Date.now()}` });
    } else {
      s.inventory.push(item);
      s.shopStock.splice(shopIdx, 1);
    }
    StateManager.save();
    this.render();
    UI.showToast(`Adquirido: ${item.name}`);
  },

  refreshShop(paid = false) {
    const s = StateManager.state;
    const cost = 25;
    if (paid) {
      if (s.gold < cost) return UI.showToast('Ouro insuficiente!');
      s.gold -= cost;
    }
    s.shopStock = Generators.generateShopStock(s.level);
    StateManager.save();
    this.render();
  },

  equipItem(invIdx) {
    const s = StateManager.state;
    const item = s.inventory[invIdx];
    if (!item || item.type !== 'equipment') return;

    const prev = s.equipment[item.slot];
    s.equipment[item.slot] = item;
    s.inventory.splice(invIdx, 1);
    if (prev) s.inventory.push(prev);

    StateManager.save();
    this.render();
    UI.triggerPulse('equipped-slots');
    UI.showToast(`Equipou ${item.name}!`);
  },

  sellItem(invIdx) {
    const s = StateManager.state;
    const item = s.inventory[invIdx];
    if (!item) return;
    this.grantGold(item.sellPrice || 10);
    s.inventory.splice(invIdx, 1);
    StateManager.save();
    this.render();
  },

  useConsumable(invIdx) {
    const s = StateManager.state;
    const item = s.inventory[invIdx];
    if (!item || item.type !== 'consumable') return;

    const eff = Formulas.getEffectiveStats(s);
    const maxHp = Formulas.getCombatProfile(eff, s.level).maxHp;
    const maxEnergy = Formulas.getMaxEnergy(s);

    if (item.effect === 'heal_hp') {
      s.currentHp = Math.min(maxHp, s.currentHp + Math.floor(maxHp * item.amountPct));
    } else if (item.effect === 'restore_energy') {
      s.currentEnergy = Math.min(maxEnergy, s.currentEnergy + item.amountFlat);
    }

    s.inventory.splice(invIdx, 1);
    StateManager.save();
    this.render();
    UI.showToast(`Usou ${item.name}!`);
  },

  runDiagnostics() {
    const results = SelfTests.runAll();
    const box = document.getElementById('diagnostics-output');
    box.innerHTML = results.map(r =>
      `<div style="color:${r.passed ? 'var(--success)' : 'var(--danger)'}">
        ${r.passed ? '✔' : '✖'} ${r.name}
      </div>`
    ).join('');
  },

  resetGame() {
    if (!confirm('Apagar permanentemente todo o progresso (incluindo Prestígio)?')) return;
    localStorage.removeItem(GameConfig.storageKey);
    GameConfig.legacyKeys.forEach(k => localStorage.removeItem(k));
    location.reload();
  }
};

window.addEventListener('DOMContentLoaded', () => App.init());
