/**
 * ============================================================================
 * UI.JS — RENDERIZAÇÃO REATIVA, ANIMAÇÕES DE FEEDBACK E MODAIS
 * ============================================================================
 */
import { GameConfig } from './config.js';
import { Formulas } from './formulas.js';
import { StateManager } from './state.js';
import { SafeMath } from './utils.js';

const STAT_META = [
  { key: 'strength',  label: 'Força',      icon: '🗡️', desc: 'Aumenta dano físico e sangramento.' },
  { key: 'defense',   label: 'Defesa',     icon: '🛡️', desc: 'Reduz o dano recebido.' },
  { key: 'agility',   label: 'Agilidade',  icon: '⚡', desc: 'Esquiva e chance crítica.' },
  { key: 'vitality',  label: 'Vitalidade', icon: '❤️', desc: 'Aumenta o HP máximo.' }
];

const SLOT_NAMES = { weapon: 'Arma', armor: 'Armadura', relic: 'Relíquia' };

export const UI = {
  selectedWorkHours: 1,
  marketSubtab: 'shop',
  _toastTimer: null,

  bindGlobalEvents(callbacks) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(btn.dataset.tab).classList.add('active');
        btn.classList.add('active');
      });
    });

    document.getElementById('btn-choose-vampire').addEventListener('click', () => callbacks.onCreateChar('vampire'));
    document.getElementById('btn-choose-werewolf').addEventListener('click', () => callbacks.onCreateChar('werewolf'));

    document.querySelectorAll('.work-option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedWorkHours = Number(btn.dataset.hours);
        document.querySelectorAll('.work-option-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });

    document.getElementById('btn-start-work').addEventListener('click', () => callbacks.onStartWork(this.selectedWorkHours));
    document.getElementById('btn-claim-work').addEventListener('click', () => callbacks.onClaimWork());

    document.getElementById('btn-refresh-targets').addEventListener('click', () => callbacks.onRefreshTargets());
    document.getElementById('btn-auto-hunt').addEventListener('click', () => callbacks.onAutoHunt());
    document.getElementById('btn-fight-boss').addEventListener('click', () => callbacks.onFightBoss());

    document.getElementById('subtab-shop').addEventListener('click', () => {
      this.marketSubtab = 'shop';
      this.renderMarket(callbacks);
    });
    document.getElementById('subtab-inventory').addEventListener('click', () => {
      this.marketSubtab = 'inventory';
      this.renderMarket(callbacks);
    });
    document.getElementById('btn-refresh-shop').addEventListener('click', () => callbacks.onRefreshShop());

    // Prestígio
    document.getElementById('btn-awaken').addEventListener('click', () => callbacks.onAwaken());

    // Save & Diagnóstico
    document.getElementById('btn-export-save').addEventListener('click', () => {
      const code = StateManager.exportBase64();
      const box = document.getElementById('save-data-textarea');
      box.value = code;
      box.select();
      this.showToast('Save exportado em Base64!');
    });

    document.getElementById('btn-import-save').addEventListener('click', () => {
      try {
        StateManager.importBase64(document.getElementById('save-data-textarea').value);
        callbacks.onAfterImport();
        this.showToast('Save importado com sucesso!');
      } catch (e) {
        this.showToast(`Erro: ${e.message}`);
      }
    });

    document.getElementById('btn-run-tests').addEventListener('click', () => callbacks.onRunTests());
    document.getElementById('btn-reset-save').addEventListener('click', () => callbacks.onResetGame());
    document.getElementById('btn-close-modal').addEventListener('click', () => {
      document.getElementById('offline-modal').classList.add('hidden');
    });
  },

  applyFactionTheme(factionId) {
    document.body.classList.remove('faction-vampire', 'faction-werewolf');
    document.body.classList.add(`faction-${factionId}`);
  },

  // Feedback visual ao subir de nível ou equipar item
  triggerPulse(elementId, cssClass = 'pulse-highlight') {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.classList.remove(cssClass);
    void el.offsetWidth; // Força reflow para reiniciar animação CSS
    el.classList.add(cssClass);
  },

  renderAll(callbacks, huntTargets, currentBoss, calcWorkFn) {
    const state = StateManager.state;
    const f = GameConfig.factions[state.faction];
    const effStats = Formulas.getEffectiveStats(state);
    const combat = Formulas.getCombatProfile(effStats, state.level);
    const maxEnergy = Formulas.getMaxEnergy(state);

    // Cabeçalho
    document.getElementById('ui-avatar').textContent = f.icon;
    document.getElementById('ui-name').textContent = state.name;
    const awakenBadge = state.prestige.count > 0 ? ` • ✨${state.prestige.count}` : '';
    document.getElementById('ui-subtitle').textContent = `Nvl ${state.level} • ${f.name}${awakenBadge}`;
    document.getElementById('ui-status-badge').textContent =
      state.activity.type === 'working' ? '⚰️ Trabalhando' : '🟢 Livre';

    // Recursos formatados com SafeMath
    document.getElementById('ui-gold').textContent = SafeMath.formatNumber(state.gold);
    document.getElementById('ui-xp').textContent = `${SafeMath.formatNumber(state.xp)}/${SafeMath.formatNumber(Formulas.xpToNextLevel(state.level))}`;
    document.getElementById('ui-hp').textContent = `${SafeMath.formatNumber(state.currentHp)}/${SafeMath.formatNumber(combat.maxHp)}`;
    document.getElementById('ui-energy').textContent = `${Math.floor(state.currentEnergy)}/${maxEnergy}`;

    // Equipamentos
    const equipContainer = document.getElementById('equipped-slots');
    equipContainer.innerHTML = ['weapon', 'armor', 'relic'].map(slot => {
      const item = state.equipment[slot];
      return `
        <div class="equip-slot-box">
          <div class="equip-slot-label">${SLOT_NAMES[slot]}</div>
          ${item
            ? `<div class="rarity-${item.rarity}" style="font-weight:700;">${item.icon} ${item.name}</div>
               <div style="font-size:0.66rem; color:var(--text-secondary); margin-top:2px;">${this.formatStatsInline(item.stats)}</div>`
            : `<div style="color:var(--text-muted);">Vazio</div>`
          }
        </div>
      `;
    }).join('');

    // Atributos
    document.getElementById('ui-faction-bonus').textContent = f.bonusDesc;
    const statsList = document.getElementById('stats-list');
    statsList.innerHTML = '';

    STAT_META.forEach(meta => {
      const baseVal = state.stats[meta.key];
      const effVal = effStats[meta.key];
      const cost = Formulas.statUpgradeCost(baseVal);
      const diff = effVal - baseVal;

      const row = document.createElement('div');
      row.className = 'stat-row';
      row.innerHTML = `
        <div class="stat-info">
          <h4>${meta.icon} ${meta.label}: <span class="stat-val">${SafeMath.formatNumber(baseVal)}</span>
            ${diff > 0 ? `<small style="color:var(--success)">(+${SafeMath.formatNumber(diff)})</small>` : ''}
          </h4>
          <p>${meta.desc}</p>
        </div>
        <button class="btn btn-gold btn-sm"
          ${state.gold < cost || state.activity.type !== 'idle' ? 'disabled' : ''}>
          +1 (${SafeMath.formatNumber(cost)} 🪙)
        </button>
      `;
      row.querySelector('button').addEventListener('click', () => callbacks.onUpgradeStat(meta.key));
      statsList.appendChild(row);
    });

    // Habilidades Ativas da Facção
    const pMult = Formulas.getPrestigeMultipliers(state.prestige);
    const skills = GameConfig.skills[state.faction] || [];
    document.getElementById('ui-skills-list').innerHTML = skills.map(sk => {
      const cd = Math.max(2, sk.cooldown - pMult.cdReduction);
      return `
        <div style="padding: 6px 0; border-bottom: 1px dashed rgba(255,255,255,0.06); font-size:0.8rem;">
          <strong>${sk.icon} ${sk.name}</strong> <span style="color:var(--accent-secondary); font-size:0.72rem;">(Recarga: ${cd} turnos)</span>
          <div style="color:var(--text-secondary); font-size:0.73rem;">${sk.desc}</div>
        </div>
      `;
    }).join('');

    // Resumo Combate
    document.getElementById('ui-derived-dmg').textContent = `${SafeMath.formatNumber(combat.minDmg)}-${SafeMath.formatNumber(combat.maxDmg)}`;
    document.getElementById('ui-derived-def').textContent = SafeMath.formatNumber(combat.armor);
    document.getElementById('ui-derived-dodge').textContent = `${(combat.dodgeChance * 100).toFixed(1)}%`;
    document.getElementById('ui-derived-crit').textContent = `${(combat.critChance * 100).toFixed(1)}%`;

    this.updateWorkPanel(calcWorkFn);
    this.renderHideout(callbacks);
    this.renderHuntAndBoss(huntTargets, currentBoss, callbacks);
    this.renderQuests(callbacks);
    this.renderMarket(callbacks);
    this.renderPrestige(callbacks);
  },

  updateWorkPanel(calcWorkFn) {
    const state = StateManager.state;
    const rates = Formulas.getWorkHourlyRates(state);
    document.getElementById('ui-work-rate').textContent = `+${SafeMath.formatNumber(rates.goldPerHour)} Ouro/h • +${SafeMath.formatNumber(rates.xpPerHour)} XP/h`;

    const isWorking = state.activity.type === 'working';
    document.getElementById('work-setup-panel').style.display = isWorking ? 'none' : 'block';
    document.getElementById('work-active-panel').style.display = isWorking ? 'block' : 'none';

    if (!isWorking) return;

    const accrued = calcWorkFn(Date.now());
    document.getElementById('ui-work-pending-gold').textContent = SafeMath.formatNumber(accrued.gold);
    document.getElementById('ui-work-pending-xp').textContent = SafeMath.formatNumber(accrued.xp);
    document.getElementById('ui-work-progress').style.width = `${accrued.progressPct}%`;

    const fmt = (s) => [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
      .map(v => String(v).padStart(2, '0')).join(':');

    if (state.activity.durationSec > 0) {
      const rem = Math.max(0, state.activity.durationSec - accrued.elapsedSec);
      document.getElementById('ui-work-mode-label').textContent = accrued.isFinished ? '✅ Concluído!' : '⏳ Vigília';
      document.getElementById('ui-work-timer').textContent = accrued.isFinished ? 'Pronto' : fmt(rem);
    } else {
      document.getElementById('ui-work-mode-label').textContent = '♾️ Contínuo';
      document.getElementById('ui-work-timer').textContent = fmt(accrued.effectiveSec);
    }
  },

  renderHideout(callbacks) {
    const state = StateManager.state;
    const container = document.getElementById('hideout-list');
    container.innerHTML = '';

    const passiveGold = Formulas.getPassiveGoldPerHour(state);
    document.getElementById('ui-passive-income').textContent = `Renda Passiva: +${SafeMath.formatNumber(passiveGold)} Ouro/h`;

    Object.values(GameConfig.hideoutBuildings).forEach(b => {
      const lvl = state.hideout[b.id] || 0;
      const isMax = lvl >= b.maxLevel;
      const cost = Formulas.hideoutUpgradeCost(b.id, lvl);

      const row = document.createElement('div');
      row.className = 'hideout-row';
      row.innerHTML = `
        <div>
          <strong style="font-size:0.88rem;">${b.icon} ${b.name} <span style="color:var(--accent-secondary)">Nvl ${lvl}/${b.maxLevel}</span></strong>
          <p style="font-size:0.73rem; color:var(--text-secondary);">${b.desc}</p>
        </div>
        <button class="btn btn-gold btn-sm" ${isMax || state.gold < cost ? 'disabled' : ''}>
          ${isMax ? 'MÁX' : `${SafeMath.formatNumber(cost)} 🪙`}
        </button>
      `;
      row.querySelector('button').addEventListener('click', () => callbacks.onUpgradeHideout(b.id));
      container.appendChild(row);
    });
  },

  renderHuntAndBoss(targets, boss, callbacks) {
    const state = StateManager.state;
    const container = document.getElementById('hunt-targets-list');
    container.innerHTML = '';

    const cost = GameConfig.curves.huntEnergyCost;
    document.getElementById('ui-hunt-cost').textContent = `Custo: ${cost} ⚡`;

    targets.forEach(t => {
      const card = document.createElement('div');
      card.className = 'target-card';
      card.innerHTML = `
        <div>
          <div style="font-weight:700; font-size:0.86rem;">
            ${t.icon} ${t.name} <span class="target-tier">${t.tier}</span>
          </div>
          <div style="font-size:0.71rem; color:var(--text-secondary);">
            Nvl ${t.level} (${t.difficultyLabel}) • FOR ${t.stats.strength} | DEF ${t.stats.defense} | AGI ${t.stats.agility}
          </div>
        </div>
        <button class="btn btn-primary btn-sm"
          ${state.currentEnergy < cost || state.activity.type !== 'idle' ? 'disabled' : ''}>
          ⚔️ Caçar
        </button>
      `;
      card.querySelector('button').addEventListener('click', () => callbacks.onHuntTarget(t));
      container.appendChild(card);
    });

    // Chefe de Marco
    if (boss) {
      const bossCost = GameConfig.curves.bossEnergyCost;
      const nowSec = Math.floor(Date.now() / 1000);
      const cdRem = Math.max(0, (state.lastBossAttempt + GameConfig.curves.bossCooldownSec) - nowSec);
      const canChallenge = cdRem === 0 && state.currentEnergy >= bossCost && state.activity.type === 'idle';

      document.getElementById('ui-boss-info').innerHTML = `
        <div style="font-weight:700; color:var(--accent-secondary); font-size:0.92rem;">
          ${boss.icon} ${boss.name} (Nvl ${boss.level})
        </div>
        <div style="font-size:0.74rem; color:var(--text-secondary);">
          ${boss.title} • Chefes derrotados: ${state.bossesDefeated} • Custo: ${bossCost} ⚡
        </div>
      `;

      const bossBtn = document.getElementById('btn-fight-boss');
      bossBtn.disabled = !canChallenge;
      bossBtn.textContent = cdRem > 0
        ? `⏳ Recarga (${Math.ceil(cdRem / 60)}m)`
        : `👑 Desafiar Chefe (${bossCost} ⚡)`;
    }
  },

  renderQuests(callbacks) {
    const state = StateManager.state;
    const container = document.getElementById('quests-list');
    container.innerHTML = '';

    state.quests.forEach((q, idx) => {
      const done = q.progress >= q.target;
      const pct = Math.min(100, Math.floor((q.progress / q.target) * 100));
      const essenceTag = q.rewardEssence > 0 ? ` +${q.rewardEssence} ✨` : '';

      const row = document.createElement('div');
      row.className = 'target-card';
      row.style.flexDirection = 'column';
      row.style.alignItems = 'stretch';
      row.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="font-size:0.85rem;">${q.icon} ${q.title}</strong>
          <span style="font-size:0.72rem; color:var(--gold);">+${SafeMath.formatNumber(q.rewardGold)} 🪙 +${SafeMath.formatNumber(q.rewardXp)} XP${essenceTag}</span>
        </div>
        <div style="font-size:0.74rem; color:var(--text-secondary); margin:3px 0;">
          ${q.desc} (${SafeMath.formatNumber(Math.min(q.progress, q.target))}/${SafeMath.formatNumber(q.target)})
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <div class="progress-track" style="margin:0; flex:1;"><div class="progress-fill" style="width:${pct}%"></div></div>
          <button class="btn btn-sm ${done ? 'btn-primary' : ''}" ${!done ? 'disabled' : ''}>
            ${done ? 'Coletar' : `${pct}%`}
          </button>
        </div>
      `;
      row.querySelector('button').addEventListener('click', () => callbacks.onClaimQuest(idx));
      container.appendChild(row);
    });
  },

  renderPrestige(callbacks) {
    const state = StateManager.state;
    const minLvl = GameConfig.prestige.minLevelRequired;
    const gain = Formulas.calculatePrestigeGain(state);

    document.getElementById('ui-essence-count').textContent = SafeMath.formatNumber(state.prestige.essence);
    document.getElementById('ui-awaken-count').textContent = state.prestige.count;

    const awakenBtn = document.getElementById('btn-awaken');
    if (state.level < minLvl) {
      awakenBtn.disabled = true;
      awakenBtn.textContent = `🔒 Requer Nível ${minLvl} (Atual: ${state.level})`;
    } else {
      awakenBtn.disabled = false;
      awakenBtn.textContent = `✨ Despertar Agora (+${SafeMath.formatNumber(gain)} Essências)`;
    }

    const list = document.getElementById('prestige-upgrades-list');
    list.innerHTML = '';

    Object.values(GameConfig.prestige.upgrades).forEach(u => {
      const lvl = state.prestige.upgrades[u.id] || 0;
      const isMax = lvl >= u.maxLevel;
      const cost = Formulas.prestigeUpgradeCost(u.id, lvl);

      const row = document.createElement('div');
      row.className = 'hideout-row';
      row.innerHTML = `
        <div>
          <strong style="font-size:0.86rem;">${u.icon} ${u.name} <span style="color:#c084fc;">Nvl ${lvl}/${u.maxLevel}</span></strong>
          <p style="font-size:0.72rem; color:var(--text-secondary);">${u.desc}</p>
        </div>
        <button class="btn btn-sm" style="border-color:#a855f7; color:#d8b4fe;" ${isMax || state.prestige.essence < cost ? 'disabled' : ''}>
          ${isMax ? 'MÁX' : `${cost} ✨`}
        </button>
      `;
      row.querySelector('button').addEventListener('click', () => callbacks.onBuyPrestigeUpgrade(u.id));
      list.appendChild(row);
    });
  },

  renderMarket(callbacks) {
    const state = StateManager.state;
    const isShop = this.marketSubtab === 'shop';

    document.getElementById('subtab-shop').classList.toggle('btn-primary', isShop);
    document.getElementById('subtab-inventory').classList.toggle('btn-primary', !isShop);
    document.getElementById('btn-refresh-shop').style.display = isShop ? 'inline-flex' : 'none';

    const list = document.getElementById('market-list');
    list.innerHTML = '';

    if (isShop) {
      state.shopStock.forEach((item, idx) => {
        const el = document.createElement('div');
        el.className = 'item-card';

        if (item.type === 'consumable') {
          el.innerHTML = `
            <div>
              <strong style="font-size:0.85rem;">${item.icon} ${item.name}</strong>
              <p style="font-size:0.72rem; color:var(--text-secondary);">${item.desc}</p>
            </div>
            <button class="btn btn-gold btn-sm" ${state.gold < item.price ? 'disabled' : ''}>${SafeMath.formatNumber(item.price)} 🪙</button>
          `;
        } else {
          const compHtml = this.buildStatComparison(item, state.equipment[item.slot]);
          el.innerHTML = `
            <div>
              <strong class="rarity-${item.rarity}" style="font-size:0.85rem;">
                ${item.icon} ${item.name} <small>[${SLOT_NAMES[item.slot]}]</small>
              </strong>
              <div style="font-size:0.72rem; color:var(--text-secondary);">${this.formatStatsInline(item.stats)}</div>
              <div style="font-size:0.69rem; margin-top:2px;">Vs. Atual: ${compHtml}</div>
            </div>
            <button class="btn btn-gold btn-sm" ${state.gold < item.price ? 'disabled' : ''}>${SafeMath.formatNumber(item.price)} 🪙</button>
          `;
        }
        el.querySelector('button').addEventListener('click', () => callbacks.onBuyItem(idx));
        list.appendChild(el);
      });
    } else {
      if (state.inventory.length === 0) {
        list.innerHTML = `<p style="text-align:center; color:var(--text-muted); font-size:0.8rem; padding:12px;">Inventário vazio.</p>`;
        return;
      }

      state.inventory.forEach((item, idx) => {
        const el = document.createElement('div');
        el.className = 'item-card';

        if (item.type === 'consumable') {
          el.innerHTML = `
            <div>
              <strong style="font-size:0.85rem;">${item.icon} ${item.name}</strong>
              <p style="font-size:0.72rem; color:var(--text-secondary);">${item.desc}</p>
            </div>
            <button class="btn btn-primary btn-sm">Usar</button>
          `;
          el.querySelector('button').addEventListener('click', () => callbacks.onUseConsumable(idx));
        } else {
          const compHtml = this.buildStatComparison(item, state.equipment[item.slot]);
          el.innerHTML = `
            <div>
              <strong class="rarity-${item.rarity}" style="font-size:0.85rem;">
                ${item.icon} ${item.name} <small>[${SLOT_NAMES[item.slot]}]</small>
              </strong>
              <div style="font-size:0.72rem; color:var(--text-secondary);">${this.formatStatsInline(item.stats)}</div>
              <div style="font-size:0.69rem; margin-top:2px;">Vs. Equipado: ${compHtml}</div>
            </div>
            <div style="display:flex; flex-direction:column; gap:4px;">
              <button class="btn btn-primary btn-sm" data-act="equip">Equipar</button>
              <button class="btn btn-sm" data-act="sell">+${SafeMath.formatNumber(item.sellPrice)} 🪙</button>
            </div>
          `;
          el.querySelector('[data-act="equip"]').addEventListener('click', () => callbacks.onEquipItem(idx));
          el.querySelector('[data-act="sell"]').addEventListener('click', () => callbacks.onSellItem(idx));
        }
        list.appendChild(el);
      });
    }
  },

  formatStatsInline(stats) {
    const labels = { strength: 'FOR', defense: 'DEF', agility: 'AGI', vitality: 'VIT' };
    return Object.entries(stats)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `+${SafeMath.formatNumber(v)} ${labels[k]}`)
      .join(' • ');
  },

  buildStatComparison(newItem, equippedItem) {
    const labels = { strength: 'FOR', defense: 'DEF', agility: 'AGI', vitality: 'VIT' };
    const diffs = [];
    for (const k of ['strength', 'defense', 'agility', 'vitality']) {
      const nv = newItem.stats[k] || 0;
      const ov = equippedItem ? (equippedItem.stats[k] || 0) : 0;
      const d = nv - ov;
      if (d > 0) diffs.push(`<span class="diff-pos">+${d} ${labels[k]}</span>`);
      else if (d < 0) diffs.push(`<span class="diff-neg">${d} ${labels[k]}</span>`);
    }
    return diffs.length > 0 ? diffs.join(' ') : '<span style="color:var(--text-muted)">Igual</span>';
  },

  renderCombatLog(entries) {
    const box = document.getElementById('combat-log');
    box.innerHTML = entries.map(line => `<div class="log-entry">${line}</div>`).join('');
    box.scrollTop = box.scrollHeight;
  },

  showOfflineModal(html) {
    document.getElementById('offline-modal-text').innerHTML = html;
    document.getElementById('offline-modal').classList.remove('hidden');
  },

  showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }
};
