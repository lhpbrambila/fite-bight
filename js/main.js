import { GameConfig } from './config.js';
import { Formulas } from './formulas.js';
import { Generators } from './generators.js';
import { WorldSystems } from './systems.js';
import { AbyssEngine } from './abyss.js';
import { CombatEngine } from './combat.js';
import { StateManager } from './state.js';
import { Diagnostics } from './tests.js';
import { UI } from './ui.js';
import { SafeMath } from './utils.js';
import { CloudSync } from './supabase.js';

let huntTargets = [];
let currentBoss = null;

async function init() {
  const hasSave = StateManager.load();
  const state = StateManager.state;

  const callbacks = {
    onCreateChar(faction) {
      const nameInput = document.getElementById('player-name-input').value;
      StateManager.state = StateManager.createDefaultState(nameInput, faction);
      const profile = Formulas.getCombatProfile(Formulas.getEffectiveStats(StateManager.state), 1, StateManager.state);
      StateManager.state.currentHp = profile.maxHp;
      StateManager.save();
      document.getElementById('faction-screen').classList.add('hidden');
      bootGame();
    },

    onUpgradeStat(statKey) {
      const s = StateManager.state;
      if (s.activity.type !== 'idle') return;
      const cost = Formulas.statUpgradeCost(s.stats[statKey], s);
      if (s.gold < cost) return;
      s.gold -= cost;
      s.stats[statKey] += 1;
      clampResources();
      StateManager.save();
      refreshUI();
    },

    onStartWork(hours) {
      const s = StateManager.state;
      if (s.activity.type !== 'idle') return;
      s.activity = {
        type: 'working',
        startTime: Date.now(),
        durationSec: hours > 0 ? hours * 3600 : 0
      };
      StateManager.save();
      refreshUI();
    },

    onClaimWork() {
      const s = StateManager.state;
      if (s.activity.type !== 'working') return;
      const accrued = calculateWorkAccrued(Date.now());
      s.gold += accrued.gold;
      s.lifetime.totalGoldEarned += accrued.gold;
      grantXp(accrued.xp);
      s.activity = { type: 'idle', startTime: 0, durationSec: 0 };
      StateManager.save();
      refreshUI();
      UI.showToast(`Coletado: +${SafeMath.formatNumber(accrued.gold)} Ouro e +${SafeMath.formatNumber(accrued.xp)} XP!`);
    },

    onUpgradeHideout(buildingId) {
      const s = StateManager.state;
      const cfg = GameConfig.hideoutBuildings[buildingId];
      const lvl = s.hideout[buildingId] || 0;
      if (lvl >= cfg.maxLevel) return;
      const cost = Formulas.hideoutUpgradeCost(buildingId, lvl, s);
      if (s.gold < cost) return;
      s.gold -= cost;
      s.hideout[buildingId] = lvl + 1;
      clampResources();
      StateManager.save();
      refreshUI();
    },

    onRecruitFollower() {
      const s = StateManager.state;
      const maxSlots = WorldSystems.getMaxClanSlots(s);
      const cost = WorldSystems.getRecruitCost(s.followers.length);
      if (s.followers.length >= maxSlots || s.gold < cost || s.expedition) return;
      s.gold -= cost;
      const follower = WorldSystems.generateFollower(s.level);
      s.followers.push(follower);
      StateManager.save();
      refreshUI();
      UI.showToast(`${follower.name} (${follower.className}) juntou-se ao clã!`);
    },

    onStartExpedition(regionId, squadUids, hours) {
      const s = StateManager.state;
      if (s.expedition || squadUids.length === 0) return;
      const squad = s.followers.filter(f => squadUids.includes(f.uid));
      const hasScout = squad.some(f => f.classId === 'scout');
      const speedMult = hasScout ? 0.90 : 1.0;

      squad.forEach(f => { f.onExpedition = true; });
      s.expedition = {
        regionId,
        squadUids: squad.map(f => f.uid),
        startTime: Date.now(),
        durationSec: Math.floor(hours * 3600 * speedMult)
      };
      UI.selectedSquad.clear();
      StateManager.save();
      refreshUI();
      UI.showToast('Esquadrão enviado em expedição!');
    },

    onClaimExpedition() {
      const s = StateManager.state;
      if (!s.expedition) return;
      const elapsed = Math.floor((Date.now() - s.expedition.startTime) / 1000);
      if (elapsed < s.expedition.durationSec) {
        UI.showToast('A expedição ainda está em andamento.');
        return;
      }
      const squad = s.followers.filter(f => s.expedition.squadUids.includes(f.uid));
      const rewards = WorldSystems.resolveExpeditionRewards(s.expedition, squad, s);
      squad.forEach(f => { f.onExpedition = false; });

      s.materials.scrap += rewards.scrap;
      s.materials.lunarShards += rewards.lunarShards;
      grantXp(rewards.xp);
      if (rewards.foundRune) s.runes.push(rewards.foundRune);
      s.lifetime.expeditionsCompleted += 1;
      s.expedition = null;

      StateManager.save();
      refreshUI();
      UI.showToast(`Expedição concluída: +${rewards.scrap} Sucata, +${rewards.lunarShards} Frag. Lunares${rewards.foundRune ? ` e ${rewards.foundRune.name}!` : '!'}`);
    },

    onHuntTarget(target) {
      const s = StateManager.state;
      const cost = GameConfig.curves.huntEnergyCost;
      if (s.currentEnergy < cost || s.activity.type !== 'idle') return;
      s.currentEnergy -= cost;
      runCombat(target);
    },

    onRefreshTargets() {
      huntTargets = Generators.generateHuntTargets(StateManager.state.level);
      refreshUI();
    },

    onAutoHunt() {
      const s = StateManager.state;
      const cost = GameConfig.curves.huntEnergyCost;
      if (s.currentEnergy < cost || s.activity.type !== 'idle') return;
      let runs = 0;
      const combinedLogs = [];
      while (s.currentEnergy >= cost && runs < GameConfig.curves.autoHuntMaxRuns && s.currentHp > 1) {
        s.currentEnergy -= cost;
        const target = huntTargets[0] || Generators.generateHuntTargets(s.level)[0];
        const res = executeSingleBattle(target);
        combinedLogs.push(...res.logs);
        runs++;
        if (!res.won) break;
      }
      UI.renderCombatLog(combinedLogs);
      StateManager.save();
      refreshUI();
    },

    onFightBoss() {
      const s = StateManager.state;
      const cost = GameConfig.curves.bossEnergyCost;
      const nowSec = Math.floor(Date.now() / 1000);
      if (s.currentEnergy < cost || s.activity.type !== 'idle') return;
      if (nowSec < s.lastBossAttempt + GameConfig.curves.bossCooldownSec) return;
      s.currentEnergy -= cost;
      s.lastBossAttempt = nowSec;
      runCombat(currentBoss, true);
    },

    onFightAbyss() {
      const s = StateManager.state;
      if (s.activity.type !== 'idle') return;
      const enemy = AbyssEngine.generateFloorEnemy(s.abyss.floor);
      runCombat(enemy, false, true);
    },

    onClaimQuest(idx) {
      const s = StateManager.state;
      const q = s.quests[idx];
      if (!q || q.progress < q.target) return;
      s.gold += q.rewardGold;
      s.lifetime.totalGoldEarned += q.rewardGold;
      grantXp(q.rewardXp);
      const fresh = Generators.generateQuests(s.level);
      s.quests[idx] = fresh[idx % fresh.length];
      StateManager.save();
      refreshUI();
      UI.showToast('Recompensa de missão coletada!');
    },

    onBuyItem(idx) {
      const s = StateManager.state;
      const item = s.shopStock[idx];
      if (!item || s.gold < item.price) return;
      s.gold -= item.price;
      s.inventory.push({
        ...item,
        uid: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      });
      if (item.type !== 'consumable') {
        s.shopStock.splice(idx, 1);
      }
      StateManager.save();
      refreshUI();
      UI.showToast(`${item.name} adicionado à Bolsa!`);
    },

    onSellItem(idx) {
      const s = StateManager.state;
      const item = s.inventory[idx];
      if (!item) return;
      const sellPrice = WorldSystems.getItemSellValue(item);
      s.gold += sellPrice;
      s.lifetime.totalGoldEarned += sellPrice;
      s.inventory.splice(idx, 1);
      StateManager.save();
      refreshUI();
      UI.showToast(`${item.name} vendido por +${SafeMath.formatNumber(sellPrice)} Ouro!`);
    },

    onRefreshShop() {
      const s = StateManager.state;
      if (s.gold < 25) return;
      s.gold -= 25;
      s.shopStock = Generators.generateShopStock(s.level);
      StateManager.save();
      refreshUI();
    },

    onUseConsumable(idx) {
      const s = StateManager.state;
      const item = s.inventory[idx];
      if (!item || item.type !== 'consumable') return;
      const combat = Formulas.getCombatProfile(Formulas.getEffectiveStats(s), s.level, s);
      const maxEnergy = Formulas.getMaxEnergy(s);

      if (item.effect === 'heal_hp') {
        s.currentHp = Math.min(combat.maxHp, s.currentHp + Math.ceil(combat.maxHp * item.amountPct));
      } else if (item.effect === 'restore_energy') {
        s.currentEnergy = Math.min(maxEnergy, s.currentEnergy + item.amountFlat);
      }
      s.inventory.splice(idx, 1);
      StateManager.save();
      refreshUI();
      UI.showToast(`${item.name} utilizado!`);
    },

    onEquipItem(idx) {
      const s = StateManager.state;
      const item = s.inventory[idx];
      if (!item || item.type === 'consumable') return;
      if (s.challenges?.active === 'bare_hands' && (item.slot === 'weapon' || item.slot === 'relic')) {
        UI.showToast('Bloqueado pelo desafio Mãos Nuas!');
        return;
      }
      const previous = s.equipment[item.slot];
      s.equipment[item.slot] = item;
      s.inventory.splice(idx, 1);
      if (previous) s.inventory.push(previous);
      clampResources();
      StateManager.save();
      refreshUI();
      UI.triggerPulse('equipped-slots');
      UI.showToast(`${item.name} equipado!`);
    },

    onUnequipItem(slot) {
      const s = StateManager.state;
      const item = s.equipment[slot];
      if (!item) return;
      s.equipment[slot] = null;
      s.inventory.push(item);
      clampResources();
      StateManager.save();
      refreshUI();
      UI.triggerPulse('equipped-slots');
      UI.showToast(`${item.name} removido e guardado na Bolsa.`);
    },

    onSalvageItem(idx) {
      const s = StateManager.state;
      const item = s.inventory[idx];
      if (!item || item.type === 'consumable') return;
      const scrap = WorldSystems.getSalvageValue(item);
      s.materials.scrap += scrap;
      s.inventory.splice(idx, 1);
      StateManager.save();
      refreshUI();
      UI.showToast(`Item sucatado: +${scrap} Sucata Arcana!`);
    },

    onForgeUpgrade(slot) {
      const s = StateManager.state;
      const item = s.equipment[slot];
      if (!item || item.upgradeLevel >= GameConfig.curves.maxUpgradeLevel) return;
      const cost = WorldSystems.getForgeUpgradeCost(item, s);
      if (s.materials.scrap < cost.scrap || s.gold < cost.gold) return;
      s.materials.scrap -= cost.scrap;
      s.gold -= cost.gold;
      item.upgradeLevel = (item.upgradeLevel || 0) + 1;
      clampResources();
      StateManager.save();
      refreshUI();
      UI.showToast(`${item.name} aprimorado para +${item.upgradeLevel}!`);
    },

    onSocketRune(slot) {
      const s = StateManager.state;
      const item = s.equipment[slot];
      if (!item || s.runes.length === 0) return;
      const maxSlots = WorldSystems.getItemRuneSlots(item, s);
      item.runes = item.runes || [];
      if (item.runes.length >= maxSlots) return;
      const rune = s.runes.shift();
      item.runes.push(rune.id);
      clampResources();
      StateManager.save();
      refreshUI();
      UI.showToast(`${rune.name} encaixada!`);
    },

    onUnsocketRune(slot, runeIdx) {
      const s = StateManager.state;
      const item = s.equipment[slot];
      if (!item?.runes?.[runeIdx]) return;
      const [removedId] = item.runes.splice(runeIdx, 1);
      const meta = GameConfig.runeCatalog.find(r => r.id === removedId);
      if (meta) s.runes.push({ ...meta, uid: `rune_${Date.now()}` });
      clampResources();
      StateManager.save();
      refreshUI();
    },

    onBuyPrestigeUpgrade(upgId) {
      const s = StateManager.state;
      const cfg = GameConfig.prestige.upgrades[upgId];
      if (!cfg) return;
      const lvl = s.prestige.upgrades[upgId] || 0;
      if (lvl >= cfg.maxLevel) return;
      const cost = Formulas.prestigeUpgradeCost(upgId, lvl);
      if (s.prestige.essence < cost) return;
      s.prestige.essence -= cost;
      s.prestige.upgrades[upgId] = lvl + 1;
      clampResources();
      StateManager.save();
      refreshUI();
      UI.showToast(`${cfg.name} aprimorado para o Nível ${lvl + 1}!`);
    },

    onAwaken() {
      const s = StateManager.state;
      if (s.level < GameConfig.prestige.minLevelRequired) return;
      const gain = Formulas.calculatePrestigeGain(s);
      performPrestigeReset(gain, null);
      UI.showToast(`Despertar concluído! +${SafeMath.formatNumber(gain)} Essências!`);
    },

    onStartChallenge(challengeId) {
      const gain = StateManager.state.level >= GameConfig.prestige.minLevelRequired
        ? Formulas.calculatePrestigeGain(StateManager.state)
        : 0;
      performPrestigeReset(gain, challengeId);
      UI.showToast('Novo ciclo iniciado sob Desafio de Sangue!');
    },

    onCompleteChallenge() {
      const s = StateManager.state;
      const chId = s.challenges?.active;
      if (!chId) return;
      s.challenges.completed[chId] = true;
      s.challenges.active = null;
      StateManager.save();
      refreshUI();
      UI.showToast('Desafio de Sangue concluído! Bônus permanente desbloqueado.');
    },

    // Callbacks Supabase Cloud Sync
    async onCloudLogin(email, password) {
      try {
        await CloudSync.signIn(email, password);
        UI.showToast('Conectado à nuvem!');
        const remote = await CloudSync.pullSave();
        if (remote?.save_data && confirm('Save encontrado na nuvem! Deseja carregar o save da nuvem agora?')) {
          StateManager.state = StateManager.migrateAndSanitize(remote.save_data);
          StateManager.lastCloudSyncAt = remote.updated_at;
          StateManager.save(false);
          document.getElementById('faction-screen').classList.add('hidden');
          callbacks.onAfterImport();
        } else if (StateManager.state.created) {
          const ts = await CloudSync.pushSave(StateManager.state);
          StateManager.lastCloudSyncAt = ts;
        }
        refreshUI();
      } catch (e) {
        UI.showToast(`Erro no login: ${e.message}`);
      }
    },

    async onCloudRegister(email, password) {
      try {
        await CloudSync.signUp(email, password);
        UI.showToast('Conta criada! Verifique seu e-mail se a confirmação estiver ativa.');
        refreshUI();
      } catch (e) {
        UI.showToast(`Erro ao cadastrar: ${e.message}`);
      }
    },

    async onCloudPush() {
      try {
        const ts = await CloudSync.pushSave(StateManager.state);
        StateManager.lastCloudSyncAt = ts;
        refreshUI();
        UI.showToast('Progresso salvo na nuvem!');
      } catch (e) {
        UI.showToast(`Erro ao enviar: ${e.message}`);
      }
    },

    async onCloudPull() {
      try {
        const remote = await CloudSync.pullSave();
        if (!remote?.save_data) {
          UI.showToast('Nenhum save encontrado na nuvem.');
          return;
        }
        if (!confirm('Sobrescrever o progresso local pelo save da nuvem?')) return;
        StateManager.state = StateManager.migrateAndSanitize(remote.save_data);
        StateManager.lastCloudSyncAt = remote.updated_at;
        StateManager.save(false);
        document.getElementById('faction-screen').classList.add('hidden');
        callbacks.onAfterImport();
        UI.showToast('Save baixado da nuvem!');
      } catch (e) {
        UI.showToast(`Erro ao baixar: ${e.message}`);
      }
    },

    async onCloudLogout() {
      try {
        await CloudSync.signOut();
        refreshUI();
        UI.showToast('Desconectado da nuvem.');
      } catch (e) {
        UI.showToast(`Erro ao sair: ${e.message}`);
      }
    },

    onAfterImport() {
      huntTargets = Generators.generateHuntTargets(StateManager.state.level);
      currentBoss = Generators.generateMilestoneBoss(StateManager.state.bossesDefeated);
      UI.applyFactionTheme(StateManager.state.faction);
      refreshUI();
    },

    onRunTests() {
      const out = document.getElementById('diagnostics-output');
      const results = Diagnostics.runAll();
      out.innerHTML = results.map(r =>
        `<div style="color:${r.pass ? 'var(--success)' : 'var(--danger)'}">${r.pass ? '[OK]' : '[FALHA]'} ${r.label}</div>`
      ).join('');
    },

    onResetGame() {
      if (!confirm('Apagar todo o progresso permanentemente?')) return;
      StateManager.resetAll();
      location.reload();
    }
  };

  UI.bindGlobalEvents(callbacks);

  await CloudSync.init(() => {
    refreshUI(callbacks);
  });

  if (!hasSave || !state.created) {
    document.getElementById('faction-screen').classList.remove('hidden');
  } else {
    bootGame(callbacks);
  }

  function bootGame(cb = callbacks) {
    const s = StateManager.state;
    UI.applyFactionTheme(s.faction);
    huntTargets = Generators.generateHuntTargets(s.level);
    currentBoss = Generators.generateMilestoneBoss(s.bossesDefeated);
    processOfflineProgress();
    refreshUI(cb);

    setInterval(() => {
      tickLoop();
      refreshUI(cb);
    }, 1000);
  }

  function refreshUI(cb = callbacks) {
    UI.renderAll(cb, huntTargets, currentBoss, calculateWorkAccrued);
  }
}

function executeSingleBattle(enemy, isMilestoneBoss = false, isAbyss = false) {
  const s = StateManager.state;
  const res = CombatEngine.simulateBattle(s, enemy);
  s.currentHp = res.remainingHp;
  s.lifetime.critsLanded += res.critsLanded;

  s.quests.forEach(q => {
    if (q.type === 'crits') q.progress += res.critsLanded;
  });

  if (res.won) {
    s.gold += res.rewardGold;
    s.lifetime.totalGoldEarned += res.rewardGold;
    s.lifetime.totalKills += 1;
    s.materials.scrap += res.rewardScrap;
    grantXp(res.rewardXp);

    s.quests.forEach(q => {
      if (q.type === 'kills') q.progress += 1;
    });

    if (res.droppedItem) s.inventory.push(res.droppedItem);

    if (isMilestoneBoss) {
      s.bossesDefeated += 1;
      currentBoss = Generators.generateMilestoneBoss(s.bossesDefeated);
    }

    if (isAbyss) {
      if (enemy.speciesId) {
        s.bestiary[enemy.speciesId] = (s.bestiary[enemy.speciesId] || 0) + 1;
      }
      s.abyss.floor += 1;
      s.abyss.maxFloor = Math.max(s.abyss.maxFloor, s.abyss.floor);
      s.lifetime.maxAbyssFloor = Math.max(s.lifetime.maxAbyssFloor, s.abyss.maxFloor);
    }
  } else {
    grantXp(res.rewardXp);
  }

  return res;
}

function runCombat(enemy, isMilestoneBoss = false, isAbyss = false) {
  const res = executeSingleBattle(enemy, isMilestoneBoss, isAbyss);
  UI.renderCombatLog(res.logs);
  StateManager.save();
  UI.renderAll(null, huntTargets, currentBoss, calculateWorkAccrued);
}

function grantXp(amount) {
  const s = StateManager.state;
  s.xp += SafeMath.int(amount, 0);
  let leveled = false;
  while (s.xp >= Formulas.xpToNextLevel(s.level)) {
    s.xp -= Formulas.xpToNextLevel(s.level);
    s.level += 1;
    leveled = true;
  }
  if (leveled) {
    const profile = Formulas.getCombatProfile(Formulas.getEffectiveStats(s), s.level, s);
    s.currentHp = profile.maxHp;
    s.currentEnergy = Formulas.getMaxEnergy(s);
    huntTargets = Generators.generateHuntTargets(s.level);
    UI.triggerPulse('ui-name');
  }
}

function calculateWorkAccrued(nowMs) {
  const s = StateManager.state;
  const elapsedSec = Math.max(0, Math.floor((nowMs - s.activity.startTime) / 1000));
  const dur = s.activity.durationSec;
  const effectiveSec = dur > 0 ? Math.min(elapsedSec, dur) : elapsedSec;
  const rates = Formulas.getWorkHourlyRates(s);
  const progressPct = dur > 0 ? Math.min(100, (effectiveSec / dur) * 100) : 100;

  return {
    elapsedSec,
    effectiveSec,
    isFinished: dur > 0 && elapsedSec >= dur,
    progressPct,
    gold: SafeMath.int((effectiveSec / 3600) * rates.goldPerHour, 0),
    xp: SafeMath.int((effectiveSec / 3600) * rates.xpPerHour, 0)
  };
}

function tickLoop() {
  const s = StateManager.state;
  if (!s?.created) return;
  const now = Date.now();
  const dtSec = Math.max(0, (now - s.lastTickTime) / 1000);
  s.lastTickTime = now;

  const profile = Formulas.getCombatProfile(Formulas.getEffectiveStats(s), s.level, s);
  const maxEnergy = Formulas.getMaxEnergy(s);
  const regenMult = s.challenges?.completed?.blood_thirst ? 2.0 : 1.0;

  s.currentHp = Math.min(profile.maxHp, s.currentHp + (profile.maxHp * GameConfig.curves.hpRegenPctPerMin * regenMult * (dtSec / 60)));
  s.currentEnergy = Math.min(maxEnergy, s.currentEnergy + (GameConfig.curves.energyRegenPerMin * (dtSec / 60)));

  const passivePerSec = Formulas.getPassiveGoldPerHour(s) / 3600;
  if (passivePerSec > 0) {
    const gained = passivePerSec * dtSec;
    s.gold += gained;
    s.lifetime.totalGoldEarned += gained;
  }

  if (Math.floor(now / 1000) % 10 === 0) {
    StateManager.save();
  }
}

function processOfflineProgress() {
  const s = StateManager.state;
  const now = Date.now();
  const rawElapsedSec = Math.max(0, Math.floor((now - s.lastTickTime) / 1000));
  s.lastTickTime = now;

  if (rawElapsedSec < 60) return;
  const offlineSec = Math.min(rawElapsedSec, GameConfig.maxOfflineSeconds);
  const passiveGold = SafeMath.int((offlineSec / 3600) * Formulas.getPassiveGoldPerHour(s), 0);

  const profile = Formulas.getCombatProfile(Formulas.getEffectiveStats(s), s.level, s);
  const maxEnergy = Formulas.getMaxEnergy(s);
  s.currentHp = Math.min(profile.maxHp, s.currentHp + (profile.maxHp * GameConfig.curves.hpRegenPctPerMin * (offlineSec / 60)));
  s.currentEnergy = Math.min(maxEnergy, s.currentEnergy + (GameConfig.curves.energyRegenPerMin * (offlineSec / 60)));

  if (passiveGold > 0) {
    s.gold += passiveGold;
    s.lifetime.totalGoldEarned += passiveGold;
  }

  const mins = Math.floor(offlineSec / 60);
  UI.showOfflineModal(
    `Você esteve ausente por <strong>${mins} min</strong>.<br>` +
    `Renda passiva da Cripta: <strong>+${SafeMath.formatNumber(passiveGold)} Ouro</strong>.<br>` +
    `Vitalidade e Energia foram restauradas.`
  );
  StateManager.save();
}

function clampResources() {
  const s = StateManager.state;
  const profile = Formulas.getCombatProfile(Formulas.getEffectiveStats(s), s.level, s);
  s.currentHp = Math.min(profile.maxHp, Math.max(1, Math.floor(s.currentHp)));
  s.currentEnergy = Math.min(Formulas.getMaxEnergy(s), s.currentEnergy);
}

function performPrestigeReset(essenceGain, challengeId) {
  const old = StateManager.state;
  const fresh = StateManager.createDefaultState(old.name, old.faction);
  fresh.prestige = {
    ...old.prestige,
    count: old.prestige.count + (essenceGain > 0 ? 1 : 0),
    essence: old.prestige.essence + essenceGain
  };
  fresh.gold = 120 + (fresh.prestige.count * GameConfig.prestige.startingGoldPerAwakening);
  fresh.challenges = {
    active: challengeId,
    completed: { ...old.challenges.completed }
  };
  fresh.bestiary = { ...old.bestiary };
  fresh.lifetime = { ...old.lifetime };
  fresh.followers = old.followers.map(f => ({ ...f, onExpedition: false }));

  StateManager.state = fresh;
  huntTargets = Generators.generateHuntTargets(1);
  currentBoss = Generators.generateMilestoneBoss(0);
  StateManager.save();
  UI.renderAll(null, huntTargets, currentBoss, calculateWorkAccrued);
}

init();