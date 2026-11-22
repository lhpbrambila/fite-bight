import { GameConfig } from './config.js';
import { Formulas } from './formulas.js';
import { WorldSystems } from './systems.js';
import { AbyssEngine, ABYSS_SPECIES, BESTIARY_MILESTONES } from './abyss.js';
import { StateManager } from './state.js';
import { SafeMath } from './utils.js';
import { iconHTML, hydrateStaticIcons } from './icons.js';

const STAT_META = [
  { key: 'strength',  label: 'Força',      iconKey: 'stats.strength', tone: 'crimson', desc: 'Dano físico e sangramento.' },
  { key: 'defense',   label: 'Defesa',     iconKey: 'stats.defense',  tone: 'moon',    desc: 'Reduz dano recebido.' },
  { key: 'agility',   label: 'Agilidade',  iconKey: 'stats.agility',  tone: 'energy',  desc: 'Esquiva e chance crítica.' },
  { key: 'vitality',  label: 'Vitalidade', iconKey: 'stats.vitality', tone: 'hp',      desc: 'Aumenta o HP máximo.' }
];

const SLOT_NAMES = { weapon: 'Arma', armor: 'Armadura', relic: 'Relíquia' };
const STAT_SHORT = { strength: 'FOR', defense: 'DEF', agility: 'AGI', vitality: 'VIT' };

export const UI = {
  selectedWorkHours: 1,
  selectedExpHours: 2,
  selectedExpRegion: 'catacombs',
  selectedSquad: new Set(),

  huntSubtab: 'hunt',
  domainSubtab: 'work',
  marketSubtab: 'shop',
  prestigeSubtab: 'awaken',
  settingsSubtab: 'stats',

  _toastTimer: null,

  bindGlobalEvents(callbacks) {
    hydrateStaticIcons(document);

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

    ['hunt', 'abyss', 'bestiary', 'quests'].forEach(sub => {
      document.getElementById(`subtab-h-${sub}`).addEventListener('click', () => {
        this.huntSubtab = sub;
        this.renderHuntSection(callbacks);
      });
    });

    ['work', 'clan'].forEach(sub => {
      document.getElementById(`subtab-d-${sub}`).addEventListener('click', () => {
        this.domainSubtab = sub;
        this.renderDomainSection(callbacks);
      });
    });

    ['shop', 'inventory', 'forge'].forEach(sub => {
      document.getElementById(`subtab-m-${sub}`).addEventListener('click', () => {
        this.marketSubtab = sub;
        this.renderMarketSection(callbacks);
      });
    });

    ['awaken', 'challenges'].forEach(sub => {
      document.getElementById(`subtab-p-${sub}`).addEventListener('click', () => {
        this.prestigeSubtab = sub;
        this.renderPrestigeSection(callbacks);
      });
    });

    ['stats', 'backup'].forEach(sub => {
      document.getElementById(`subtab-s-${sub}`).addEventListener('click', () => {
        this.settingsSubtab = sub;
        this.renderSettingsSection(callbacks);
      });
    });

    document.querySelectorAll('.work-option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedWorkHours = Number(btn.dataset.hours);
        document.querySelectorAll('.work-option-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });
    document.getElementById('btn-start-work').addEventListener('click', () => callbacks.onStartWork(this.selectedWorkHours));
    document.getElementById('btn-claim-work').addEventListener('click', () => callbacks.onClaimWork());

    document.getElementById('btn-recruit-follower').addEventListener('click', () => callbacks.onRecruitFollower());
    document.querySelectorAll('.exp-dur-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedExpHours = Number(btn.dataset.hours);
        document.querySelectorAll('.exp-dur-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });
    document.getElementById('btn-start-expedition').addEventListener('click', () => {
      callbacks.onStartExpedition(this.selectedExpRegion, Array.from(this.selectedSquad), this.selectedExpHours);
    });
    document.getElementById('btn-claim-expedition').addEventListener('click', () => callbacks.onClaimExpedition());

    document.getElementById('btn-refresh-targets').addEventListener('click', () => callbacks.onRefreshTargets());
    document.getElementById('btn-auto-hunt').addEventListener('click', () => callbacks.onAutoHunt());
    document.getElementById('btn-fight-boss').addEventListener('click', () => callbacks.onFightBoss());
    document.getElementById('btn-fight-abyss').addEventListener('click', () => callbacks.onFightAbyss());

    document.getElementById('btn-refresh-shop').addEventListener('click', () => callbacks.onRefreshShop());
    document.getElementById('btn-awaken').addEventListener('click', () => callbacks.onAwaken());

    document.getElementById('btn-export-save').addEventListener('click', () => {
      const code = StateManager.exportBase64();
      const box = document.getElementById('save-data-textarea');
      box.value = code;
      box.select();
      this.showToast('Save v4.1 exportado!');
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

  triggerPulse(elementId, cssClass = 'pulse-highlight') {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.classList.remove(cssClass);
    void el.offsetWidth;
    el.classList.add(cssClass);
  },

  renderAll(callbacks, huntTargets, currentBoss, calcWorkFn) {
    this._lastHuntTargets = huntTargets;
    this._lastBoss = currentBoss;
    this._calcWorkFn = calcWorkFn;
    if (callbacks) this._lastCallbacks = callbacks;
    const cb = callbacks || this._lastCallbacks;

    const state = StateManager.state;
    const f = GameConfig.factions[state.faction];
    const effStats = Formulas.getEffectiveStats(state);
    const combat = Formulas.getCombatProfile(effStats, state.level, state);
    const maxEnergy = Formulas.getMaxEnergy(state);
    const moon = WorldSystems.getCurrentMoonPhase();

    const factionTone = state.faction === 'werewolf' ? 'amber' : 'crimson';
    document.getElementById('ui-avatar').innerHTML = iconHTML(f.iconKey || `factions.${state.faction}`, { size: 'md', tone: factionTone, glow: true });
    document.getElementById('ui-name').textContent = state.name;

    const awakenBadge = state.prestige.count > 0
      ? ` • ${iconHTML('nav.prestige', { size: 'xs', tone: 'soul' })} ${state.prestige.count}`
      : '';
    const chalBadge = state.challenges?.active
      ? ` • ${iconHTML('subtabs.challenges', { size: 'xs', tone: 'crimson' })}`
      : '';
    document.getElementById('ui-subtitle').innerHTML = `Nvl ${state.level} • ${f.name}${awakenBadge}${chalBadge}`;

    const moonBadge = document.getElementById('ui-moon-badge');
    moonBadge.innerHTML = `${iconHTML(moon.iconKey || `moon.${moon.id}`, { size: 'sm', tone: 'moon', glow: moon.id === 'full_moon' })} <span>${moon.name}</span>`;
    moonBadge.title = moon.desc;

    document.getElementById('ui-gold').textContent = SafeMath.formatNumber(state.gold);
    document.getElementById('ui-xp').textContent = `${SafeMath.formatNumber(state.xp)}/${SafeMath.formatNumber(Formulas.xpToNextLevel(state.level))}`;
    document.getElementById('ui-hp').textContent = `${SafeMath.formatNumber(state.currentHp)}/${SafeMath.formatNumber(combat.maxHp)}`;
    document.getElementById('ui-energy').textContent = `${Math.floor(state.currentEnergy)}/${maxEnergy}`;

    const chalBanner = document.getElementById('active-challenge-banner');
    if (state.challenges?.active) {
      const ch = GameConfig.prestige.challenges[state.challenges.active];
      chalBanner.classList.remove('hidden');
      chalBanner.innerHTML = `${iconHTML('subtabs.challenges', { size: 'xs', tone: 'crimson' })} <strong>Desafio Ativo: ${ch.name}</strong> — ${ch.restrictionDesc} (Meta: ${ch.goalDesc})`;
    } else {
      chalBanner.classList.add('hidden');
    }

    this.renderHeroTab(cb, effStats, combat);
    this.renderHuntSection(cb);
    this.renderDomainSection(cb);
    this.renderPrestigeSection(cb);
    this.renderMarketSection(cb);
    this.renderSettingsSection(cb);
  },

  renderHeroTab(callbacks, effStats, combat) {
    const state = StateManager.state;
    const f = GameConfig.factions[state.faction];
    const isBareHands = state.challenges?.active === 'bare_hands';

    const equipContainer = document.getElementById('equipped-slots');
    equipContainer.innerHTML = '';

    ['weapon', 'armor', 'relic'].forEach(slot => {
      const locked = isBareHands && (slot === 'weapon' || slot === 'relic');
      const item = state.equipment[slot];
      const upgTag = item && item.upgradeLevel > 0 ? ` +${item.upgradeLevel}` : '';
      const runeIcons = item?.runes?.map(rId => {
        const rMeta = GameConfig.runeCatalog.find(r => r.id === rId);
        return rMeta ? iconHTML(rMeta.iconKey, { size: 'xs', tone: 'soul' }) : '';
      }).join('') || '';
      const itemIconKey = item?.iconKey || `items.${slot}`;
      const effItemStats = item ? WorldSystems.getItemEffectiveStats(item) : null;

      const box = document.createElement('div');
      box.className = 'equip-slot-box';
      if (locked) {
        box.style.opacity = '0.45';
        box.style.borderColor = 'var(--danger)';
      }

      if (item) {
        box.innerHTML = `
          <div class="equip-slot-label">${SLOT_NAMES[slot]}</div>
          <div class="rarity-${item.rarity}" style="font-weight:700; font-size:0.78rem;">${iconHTML(itemIconKey, { size: 'sm', active: true })} ${item.name}${upgTag}</div>
          <div style="font-size:0.65rem; color:var(--text-secondary); margin-top:2px;">${this.formatStatsInline(effItemStats)} ${runeIcons}</div>
          <button class="btn btn-sm" data-unequip="${slot}" style="margin-top:6px; width:100%; padding:3px 6px; font-size:0.68rem;">Tirar</button>
        `;
        box.querySelector('[data-unequip]').addEventListener('click', (ev) => {
          ev.stopPropagation();
          callbacks?.onUnequipItem?.(slot);
        });
      } else {
        box.innerHTML = `
          <div class="equip-slot-label">${SLOT_NAMES[slot]} ${locked ? iconHTML('actions.lock', { size: 'xs', tone: 'crimson' }) : ''}</div>
          <div style="color:var(--text-muted); font-size:0.74rem; margin-top:4px;">${locked ? 'Bloqueado' : 'Vazio'}</div>
        `;
      }

      equipContainer.appendChild(box);
    });

    document.getElementById('ui-faction-bonus').textContent = f.bonusDesc;
    const statsList = document.getElementById('stats-list');
    statsList.innerHTML = '';

    STAT_META.forEach(meta => {
      const baseVal = state.stats[meta.key];
      const effVal = effStats[meta.key];
      const cost = Formulas.statUpgradeCost(baseVal, state);
      const diff = effVal - baseVal;
      const canBuy = state.gold >= cost && state.activity.type === 'idle';

      const row = document.createElement('div');
      row.className = 'stat-row';
      row.innerHTML = `
        <div class="stat-info">
          <h4>${iconHTML(meta.iconKey, { size: 'sm', tone: meta.tone })} ${meta.label}: <span class="stat-val">${SafeMath.formatNumber(baseVal)}</span>
            ${diff > 0 ? `<small style="color:var(--success)">(+${SafeMath.formatNumber(diff)})</small>` : ''}
          </h4>
          <p>${meta.desc}</p>
        </div>
        <button class="btn btn-gold btn-sm" ${!canBuy ? 'disabled' : ''}>
          +1 (${SafeMath.formatNumber(cost)} ${iconHTML('currency.gold', { size: 'xs', tone: 'gold', disabled: !canBuy })})
        </button>
      `;
      row.querySelector('button').addEventListener('click', () => callbacks?.onUpgradeStat?.(meta.key));
      statsList.appendChild(row);
    });

    const moon = WorldSystems.getCurrentMoonPhase();
    document.getElementById('ui-moon-detail').innerHTML = `${iconHTML(moon.iconKey || `moon.${moon.id}`, { size: 'sm', tone: 'moon' })} <strong>${moon.name}:</strong> ${moon.desc}`;
    document.getElementById('ui-derived-dmg').textContent = `${SafeMath.formatNumber(combat.minDmg)}-${SafeMath.formatNumber(combat.maxDmg)}`;
    document.getElementById('ui-derived-def').textContent = SafeMath.formatNumber(combat.armor);
    document.getElementById('ui-derived-dodge').textContent = `${(combat.dodgeChance * 100).toFixed(1)}%`;
    document.getElementById('ui-derived-crit').textContent = `${(combat.critChance * 100).toFixed(1)}% (${(combat.critDamageMult * 100).toFixed(0)}%)`;
  },

  renderHuntSection(callbacks) {
    ['hunt', 'abyss', 'bestiary', 'quests'].forEach(sub => {
      document.getElementById(`subtab-h-${sub}`).classList.toggle('btn-primary', this.huntSubtab === sub);
      document.getElementById(`panel-h-${sub}`).style.display = this.huntSubtab === sub ? 'block' : 'none';
    });

    const state = StateManager.state;
    const targets = this._lastHuntTargets || [];
    const boss = this._lastBoss;

    const cost = GameConfig.curves.huntEnergyCost;
    document.getElementById('ui-hunt-cost').innerHTML = `Custo: ${cost} ${iconHTML('stats.energy', { size: 'xs', tone: 'energy' })}`;
    const list = document.getElementById('hunt-targets-list');
    list.innerHTML = '';

    targets.forEach(t => {
      const targetIconKey = t.iconKey || 'combat.target';
      const canHunt = state.currentEnergy >= cost && state.activity.type === 'idle';
      const card = document.createElement('div');
      card.className = 'target-card';
      card.innerHTML = `
        <div>
          <div style="font-weight:700; font-size:0.85rem;">${iconHTML(targetIconKey, { size: 'sm' })} ${t.name} <span class="target-tier">${t.tier}</span></div>
          <div style="font-size:0.7rem; color:var(--text-secondary);">Nvl ${t.level} (${t.difficultyLabel}) • FOR ${SafeMath.formatNumber(t.stats.strength)} | DEF ${SafeMath.formatNumber(t.stats.defense)}</div>
        </div>
        <button class="btn btn-primary btn-sm" ${!canHunt ? 'disabled' : ''}>${iconHTML('nav.hunt', { size: 'xs', disabled: !canHunt })} Caçar</button>
      `;
      card.querySelector('button').addEventListener('click', () => callbacks?.onHuntTarget?.(t));
      list.appendChild(card);
    });

    if (boss) {
      const bossCost = GameConfig.curves.bossEnergyCost;
      const nowSec = Math.floor(Date.now() / 1000);
      const cdRem = Math.max(0, (state.lastBossAttempt + GameConfig.curves.bossCooldownSec) - nowSec);
      const canChallenge = cdRem === 0 && state.currentEnergy >= bossCost && state.activity.type === 'idle';
      const bossIconKey = boss.iconKey || 'combat.boss';
      document.getElementById('ui-boss-info').innerHTML = `
        <strong style="color:var(--accent-secondary); font-size:0.9rem;">${iconHTML(bossIconKey, { size: 'sm', tone: 'gold', glow: true })} ${boss.name} (Nvl ${boss.level})</strong>
        <div style="font-size:0.72rem; color:var(--text-secondary);">${boss.title} • Derrotados: ${state.bossesDefeated}</div>
      `;
      const btn = document.getElementById('btn-fight-boss');
      btn.disabled = !canChallenge;
      btn.innerHTML = cdRem > 0
        ? `${iconHTML('actions.lock', { size: 'sm', disabled: true })} Recarga (${Math.ceil(cdRem / 60)}m)`
        : `${iconHTML('combat.boss', { size: 'sm', tone: 'gold', disabled: !canChallenge })} Desafiar Chefe (${bossCost} ${iconHTML('stats.energy', { size: 'xs', tone: 'energy' })})`;
    }

    const abyssEnemy = AbyssEngine.generateFloorEnemy(state.abyss.floor);
    document.getElementById('ui-abyss-floor').textContent = `Andar ${state.abyss.floor} (Recorde: ${state.abyss.maxFloor})`;
    document.getElementById('ui-abyss-enemy').innerHTML = `
      <div style="font-weight:700; font-size:0.92rem; color:${abyssEnemy.isMiniBoss ? 'var(--accent-secondary)' : 'var(--text-primary)'}">
        ${iconHTML(abyssEnemy.iconKey, { size: 'sm', tone: abyssEnemy.isMiniBoss ? 'gold' : 'soul', glow: abyssEnemy.isMiniBoss })} ${abyssEnemy.name}
      </div>
      <div style="font-size:0.74rem; color:var(--text-secondary); margin-top:3px;">
        FOR ${SafeMath.formatNumber(abyssEnemy.stats.strength)} | DEF ${SafeMath.formatNumber(abyssEnemy.stats.defense)} | VIT ${SafeMath.formatNumber(abyssEnemy.stats.vitality)}
      </div>
      ${abyssEnemy.mechanic ? `<div style="font-size:0.74rem; color:#fb7185; margin-top:4px;">${iconHTML('combat.warning', { size: 'xs', tone: 'amber' })} ${abyssEnemy.mechanic.name}: ${abyssEnemy.mechanic.desc}</div>` : ''}
    `;

    const bestiaryList = document.getElementById('bestiary-list');
    bestiaryList.innerHTML = ABYSS_SPECIES.map(sp => {
      const kills = state.bestiary[sp.id] || 0;
      const nextMilestone = BESTIARY_MILESTONES.find(m => kills < m) || BESTIARY_MILESTONES[BESTIARY_MILESTONES.length - 1];
      const tiers = BESTIARY_MILESTONES.filter(m => kills >= m).length;
      const pct = Math.min(100, Math.floor((kills / nextMilestone) * 100));
      return `
        <div class="target-card" style="flex-direction:column; align-items:stretch;">
          <div style="display:flex; justify-content:space-between; font-size:0.82rem;">
            <strong>${iconHTML(sp.iconKey, { size: 'sm', tone: 'soul' })} ${sp.name} (Rank ${tiers}/4)</strong>
            <span>${SafeMath.formatNumber(kills)} / ${SafeMath.formatNumber(nextMilestone)}</span>
          </div>
          <div style="font-size:0.71rem; color:var(--success);">${sp.desc}</div>
          <div class="progress-track" style="margin:4px 0 0 0;"><div class="progress-fill" style="width:${pct}%"></div></div>
        </div>
      `;
    }).join('');

    const qList = document.getElementById('quests-list');
    qList.innerHTML = '';
    state.quests.forEach((q, idx) => {
      const done = q.progress >= q.target;
      const pct = Math.min(100, Math.floor((q.progress / q.target) * 100));
      const questIconKey = q.iconKey || 'subtabs.quests';
      const row = document.createElement('div');
      row.className = 'target-card';
      row.style.flexDirection = 'column';
      row.style.alignItems = 'stretch';
      row.innerHTML = `
        <div style="display:flex; justify-content:space-between;">
          <strong style="font-size:0.84rem;">${iconHTML(questIconKey, { size: 'sm', tone: 'gold' })} ${q.title}</strong>
          <span style="font-size:0.72rem; color:var(--gold);">+${SafeMath.formatNumber(q.rewardGold)} ${iconHTML('currency.gold', { size: 'xs', tone: 'gold' })} +${SafeMath.formatNumber(q.rewardXp)} XP</span>
        </div>
        <div style="font-size:0.73rem; color:var(--text-secondary);">${q.desc} (${SafeMath.formatNumber(Math.min(q.progress, q.target))}/${SafeMath.formatNumber(q.target)})</div>
        <div style="display:flex; align-items:center; gap:8px; margin-top:4px;">
          <div class="progress-track" style="margin:0; flex:1;"><div class="progress-fill" style="width:${pct}%"></div></div>
          <button class="btn btn-sm ${done ? 'btn-primary' : ''}" ${!done ? 'disabled' : ''}>${done ? 'Coletar' : `${pct}%`}</button>
        </div>
      `;
      row.querySelector('button').addEventListener('click', () => callbacks?.onClaimQuest?.(idx));
      qList.appendChild(row);
    });
  },

  renderDomainSection(callbacks) {
    ['work', 'clan'].forEach(sub => {
      document.getElementById(`subtab-d-${sub}`).classList.toggle('btn-primary', this.domainSubtab === sub);
      document.getElementById(`panel-d-${sub}`).style.display = this.domainSubtab === sub ? 'block' : 'none';
    });

    const state = StateManager.state;
    this.updateWorkPanel(this._calcWorkFn);

    const hContainer = document.getElementById('hideout-list');
    hContainer.innerHTML = '';
    document.getElementById('ui-passive-income').textContent = `Renda: +${SafeMath.formatNumber(Formulas.getPassiveGoldPerHour(state))} Ouro/h`;

    Object.values(GameConfig.hideoutBuildings).forEach(b => {
      const lvl = state.hideout[b.id] || 0;
      const isMax = lvl >= b.maxLevel;
      const cost = Formulas.hideoutUpgradeCost(b.id, lvl, state);
      const disabled = isMax || state.gold < cost;
      const row = document.createElement('div');
      row.className = 'hideout-row';
      row.innerHTML = `
        <div>
          <strong style="font-size:0.86rem;">${iconHTML(b.iconKey, { size: 'sm', tone: 'amber', active: lvl > 0 })} ${b.name} <span style="color:var(--accent-secondary)">Nvl ${lvl}/${b.maxLevel}</span></strong>
          <p style="font-size:0.72rem; color:var(--text-secondary);">${b.desc}</p>
        </div>
        <button class="btn btn-gold btn-sm" ${disabled ? 'disabled' : ''}>${isMax ? 'MÁX' : `${SafeMath.formatNumber(cost)} ${iconHTML('currency.gold', { size: 'xs', tone: 'gold', disabled })}`}</button>
      `;
      row.querySelector('button').addEventListener('click', () => callbacks?.onUpgradeHideout?.(b.id));
      hContainer.appendChild(row);
    });

    const maxSlots = WorldSystems.getMaxClanSlots(state);
    const recruitCost = WorldSystems.getRecruitCost(state.followers.length);
    document.getElementById('ui-clan-slots').textContent = `${state.followers.length}/${maxSlots} Seguidores`;
    const recBtn = document.getElementById('btn-recruit-follower');
    const recDisabled = state.followers.length >= maxSlots || state.gold < recruitCost || Boolean(state.expedition);
    recBtn.disabled = recDisabled;
    recBtn.innerHTML = state.followers.length >= maxSlots
      ? 'Clã Cheio'
      : `Recrutar (${SafeMath.formatNumber(recruitCost)} ${iconHTML('currency.gold', { size: 'xs', tone: 'gold', disabled: recDisabled })})`;

    const fList = document.getElementById('followers-list');
    fList.innerHTML = '';
    if (state.followers.length === 0) {
      fList.innerHTML = `<p style="font-size:0.75rem; color:var(--text-muted);">Nenhum seguidor recrutado.</p>`;
    } else {
      state.followers.forEach(fol => {
        const isSel = this.selectedSquad.has(fol.uid);
        const pwr = WorldSystems.calculateFollowerPower(fol);
        const classMeta = GameConfig.followerClasses[fol.classId];
        const folIconKey = fol.iconKey || classMeta?.iconKey || 'domain.scout';
        const row = document.createElement('div');
        row.className = 'target-card';
        row.style.borderColor = isSel ? 'var(--accent-primary)' : 'var(--border-subtle)';
        row.innerHTML = `
          <div>
            <strong class="rarity-${fol.rarity}" style="font-size:0.84rem;">${iconHTML(folIconKey, { size: 'sm', active: isSel })} ${fol.name} (${fol.className})</strong>
            <div style="font-size:0.7rem; color:var(--text-secondary);">Poder: ${pwr} • ${classMeta.bonusDesc}</div>
          </div>
          <button class="btn btn-sm ${isSel ? 'btn-primary' : ''}" ${state.expedition ? 'disabled' : ''}>
            ${fol.onExpedition ? 'Em Missão' : (isSel ? `${iconHTML('actions.check', { size: 'xs' })} Esquadrão` : 'Escalar')}
          </button>
        `;
        row.querySelector('button').addEventListener('click', () => {
          if (this.selectedSquad.has(fol.uid)) this.selectedSquad.delete(fol.uid);
          else if (this.selectedSquad.size < GameConfig.curves.maxSquadSize) this.selectedSquad.add(fol.uid);
          else this.showToast('Máximo de 3 seguidores por esquadrão!');
          this.renderDomainSection(callbacks);
        });
        fList.appendChild(row);
      });
    }

    const expSetup = document.getElementById('expedition-setup');
    const expActive = document.getElementById('expedition-active');
    if (state.expedition) {
      expSetup.style.display = 'none';
      expActive.style.display = 'block';
      const reg = GameConfig.expeditionRegions.find(r => r.id === state.expedition.regionId);
      const elapsed = Math.floor((Date.now() - state.expedition.startTime) / 1000);
      const done = elapsed >= state.expedition.durationSec;
      const pct = Math.min(100, Math.floor((elapsed / state.expedition.durationSec) * 100));
      document.getElementById('ui-exp-status').innerHTML = `
        <strong>${iconHTML(reg.iconKey, { size: 'sm', tone: 'amber' })} ${reg.name}</strong> — ${done ? '<span style="color:var(--success)">Concluída!</span>' : `${pct}%`}
      `;
      document.getElementById('ui-exp-progress').style.width = `${pct}%`;
    } else {
      expSetup.style.display = 'block';
      expActive.style.display = 'none';
      const regContainer = document.getElementById('expedition-regions');
      regContainer.innerHTML = GameConfig.expeditionRegions.map(r => `
        <button class="work-option-btn ${this.selectedExpRegion === r.id ? 'selected' : ''}" data-reg="${r.id}">
          <strong>${iconHTML(r.iconKey, { size: 'sm', tone: 'amber', active: this.selectedExpRegion === r.id })} ${r.name}</strong>
          <span>Poder Rec.: ${r.reqPower} • ${r.desc}</span>
        </button>
      `).join('');
      regContainer.querySelectorAll('button').forEach(b => {
        b.addEventListener('click', () => {
          this.selectedExpRegion = b.dataset.reg;
          this.renderDomainSection(callbacks);
        });
      });

      const squadFollowers = state.followers.filter(f => this.selectedSquad.has(f.uid));
      const squadPower = WorldSystems.calculateSquadPower(squadFollowers);
      document.getElementById('ui-squad-power').textContent = `Esquadrão: ${squadFollowers.length}/3 • Poder Total: ${squadPower}`;
      document.getElementById('btn-start-expedition').disabled = squadFollowers.length === 0;
    }
  },

  updateWorkPanel(calcWorkFn) {
    if (!calcWorkFn) return;
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
      document.getElementById('ui-work-mode-label').innerHTML = accrued.isFinished
        ? `${iconHTML('actions.check', { size: 'xs', tone: 'gold' })} Concluído!`
        : `${iconHTML('moon.offline', { size: 'xs', tone: 'moon' })} Vigília`;
      document.getElementById('ui-work-timer').textContent = accrued.isFinished ? 'Pronto' : fmt(rem);
    } else {
      document.getElementById('ui-work-mode-label').textContent = 'Contínuo (∞)';
      document.getElementById('ui-work-timer').textContent = fmt(accrued.effectiveSec);
    }
  },

  renderPrestigeSection(callbacks) {
    ['awaken', 'challenges'].forEach(sub => {
      document.getElementById(`subtab-p-${sub}`).classList.toggle('btn-primary', this.prestigeSubtab === sub);
      document.getElementById(`panel-p-${sub}`).style.display = this.prestigeSubtab === sub ? 'block' : 'none';
    });

    const state = StateManager.state;
    const minLvl = GameConfig.prestige.minLevelRequired;
    const gain = Formulas.calculatePrestigeGain(state);

    document.getElementById('ui-essence-count').textContent = SafeMath.formatNumber(state.prestige.essence);
    document.getElementById('ui-awaken-count').textContent = state.prestige.count;

    const awakenBtn = document.getElementById('btn-awaken');
    const locked = state.level < minLvl;
    awakenBtn.disabled = locked;
    awakenBtn.innerHTML = locked
      ? `${iconHTML('actions.lock', { size: 'sm', disabled: true })} Requer Nível ${minLvl} (Atual: ${state.level})`
      : `${iconHTML('nav.prestige', { size: 'sm', tone: 'soul', glow: true })} Despertar Normal (+${SafeMath.formatNumber(gain)} Essências)`;

    const list = document.getElementById('prestige-upgrades-list');
    list.innerHTML = '';
    Object.values(GameConfig.prestige.upgrades).forEach(u => {
      const lvl = state.prestige.upgrades[u.id] || 0;
      const isMax = lvl >= u.maxLevel;
      const cost = Formulas.prestigeUpgradeCost(u.id, lvl);
      const disabled = isMax || state.prestige.essence < cost;
      const row = document.createElement('div');
      row.className = 'hideout-row';
      row.innerHTML = `
        <div>
          <strong style="font-size:0.85rem;">${iconHTML(u.iconKey, { size: 'sm', tone: 'soul', active: lvl > 0 })} ${u.name} <span style="color:#c084fc;">Nvl ${lvl}/${u.maxLevel}</span></strong>
          <p style="font-size:0.71rem; color:var(--text-secondary);">${u.desc}</p>
        </div>
        <button class="btn btn-sm" style="border-color:#a855f7; color:#d8b4fe;" ${disabled ? 'disabled' : ''}>
          ${isMax ? 'MÁX' : `${cost} ${iconHTML('currency.essence', { size: 'xs', tone: 'soul', disabled })}`}
        </button>
      `;
      row.querySelector('button').addEventListener('click', () => callbacks?.onBuyPrestigeUpgrade?.(u.id));
      list.appendChild(row);
    });

    const cList = document.getElementById('challenges-list');
    cList.innerHTML = '';
    Object.values(GameConfig.prestige.challenges).forEach(ch => {
      const isCompleted = Boolean(state.challenges.completed[ch.id]);
      const isActive = state.challenges.active === ch.id;
      const goalMet = isActive && state.level >= ch.targetLevel && state.abyss.maxFloor >= ch.targetAbyss;

      const card = document.createElement('div');
      card.className = 'target-card';
      card.style.flexDirection = 'column';
      card.style.alignItems = 'stretch';
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between;">
          <strong style="font-size:0.86rem;">${iconHTML(ch.iconKey, { size: 'sm', tone: 'crimson' })} ${ch.name} ${isCompleted ? iconHTML('actions.check', { size: 'xs', tone: 'gold' }) : ''}</strong>
          <span style="font-size:0.7rem; color:var(--accent-secondary);">${ch.goalDesc}</span>
        </div>
        <div style="font-size:0.72rem; color:#fb7185; margin-top:2px;">Restrição: ${ch.restrictionDesc}</div>
        <div style="font-size:0.72rem; color:var(--success); margin-bottom:6px;">Recompensa: ${ch.rewardDesc}</div>
        <button class="btn btn-sm ${goalMet ? 'btn-primary' : ''}" ${isActive && !goalMet ? 'disabled' : ''}>
          ${goalMet
            ? `${iconHTML('combat.win', { size: 'xs', tone: 'gold' })} Concluir Desafio!`
            : (isActive ? `${iconHTML('subtabs.challenges', { size: 'xs' })} Desafio em Andamento` : 'Iniciar Ciclo com este Desafio')}
        </button>
      `;
      card.querySelector('button').addEventListener('click', () => {
        if (goalMet) callbacks?.onCompleteChallenge?.();
        else callbacks?.onStartChallenge?.(ch.id);
      });
      cList.appendChild(card);
    });
  },

  renderMarketSection(callbacks) {
    ['shop', 'inventory', 'forge'].forEach(sub => {
      document.getElementById(`subtab-m-${sub}`).classList.toggle('btn-primary', this.marketSubtab === sub);
    });
    document.getElementById('btn-refresh-shop').style.display = this.marketSubtab === 'shop' ? 'inline-flex' : 'none';

    const state = StateManager.state;
    const list = document.getElementById('market-list');
    list.innerHTML = '';

    if (this.marketSubtab === 'shop') {
      state.shopStock.forEach((item, idx) => {
        const el = document.createElement('div');
        el.className = 'item-card';
        const disabled = state.gold < item.price;
        const itemIconKey = item.iconKey || (item.type === 'consumable' ? 'items.potionSmall' : `items.${item.slot}`);

        if (item.type === 'consumable') {
          el.innerHTML = `
            <div>
              <strong style="font-size:0.84rem;">${iconHTML(itemIconKey, { size: 'sm', tone: 'hp' })} ${item.name}</strong>
              <p style="font-size:0.71rem; color:var(--text-secondary);">${item.desc}</p>
            </div>
            <button class="btn btn-gold btn-sm" ${disabled ? 'disabled' : ''}>${SafeMath.formatNumber(item.price)} ${iconHTML('currency.gold', { size: 'xs', tone: 'gold', disabled })}</button>
          `;
        } else {
          const effStats = WorldSystems.getItemEffectiveStats(item);
          const equipped = state.equipment[item.slot];
          const cmpHtml = this.formatItemComparisonHTML(item, equipped);

          el.innerHTML = `
            <div style="flex:1; padding-right:8px;">
              <strong class="rarity-${item.rarity}" style="font-size:0.84rem;">${iconHTML(itemIconKey, { size: 'sm' })} ${item.name} [${SLOT_NAMES[item.slot]}]</strong>
              <div style="font-size:0.71rem; color:var(--text-secondary);">${this.formatStatsInline(effStats)}</div>
              ${cmpHtml}
            </div>
            <button class="btn btn-gold btn-sm" ${disabled ? 'disabled' : ''}>${SafeMath.formatNumber(item.price)} ${iconHTML('currency.gold', { size: 'xs', tone: 'gold', disabled })}</button>
          `;
        }
        el.querySelector('button').addEventListener('click', () => callbacks?.onBuyItem?.(idx));
        list.appendChild(el);
      });

      const sellHeader = document.createElement('div');
      sellHeader.style.cssText = 'margin-top:14px; padding-top:10px; border-top:1px solid var(--border-subtle); font-size:0.8rem; font-weight:700; display:flex; justify-content:space-between; align-items:center;';
      sellHeader.innerHTML = `
        <span>Vender Itens da Bolsa</span>
        <span style="font-size:0.7rem; color:var(--text-secondary);">50% do valor original</span>
      `;
      list.appendChild(sellHeader);

      if (state.inventory.length === 0) {
        const emptySell = document.createElement('p');
        emptySell.style.cssText = 'text-align:center; color:var(--text-muted); font-size:0.75rem; padding:8px 0;';
        emptySell.textContent = 'Nenhum item na bolsa para vender.';
        list.appendChild(emptySell);
      } else {
        state.inventory.forEach((item, idx) => {
          list.appendChild(this.createSellableInventoryCard(item, idx, callbacks));
        });
      }
    } else if (this.marketSubtab === 'inventory') {
      if (state.inventory.length === 0) {
        list.innerHTML = `<p style="text-align:center; color:var(--text-muted); font-size:0.78rem; padding:12px;">Inventário vazio.</p>`;
        return;
      }
      state.inventory.forEach((item, idx) => {
        const el = document.createElement('div');
        el.className = 'item-card';
        const itemIconKey = item.iconKey || (item.type === 'consumable' ? 'items.potionSmall' : `items.${item.slot}`);
        const sellVal = WorldSystems.getItemSellValue(item);

        if (item.type === 'consumable') {
          el.innerHTML = `
            <div style="flex:1; padding-right:8px;">
              <strong style="font-size:0.84rem;">${iconHTML(itemIconKey, { size: 'sm', tone: 'hp' })} ${item.name}</strong>
              <p style="font-size:0.71rem; color:var(--text-secondary);">${item.desc}</p>
            </div>
            <div style="display:flex; flex-direction:column; gap:4px;">
              <button class="btn btn-primary btn-sm" data-act="use">Usar</button>
              <button class="btn btn-sm" data-act="sell">Vender +${SafeMath.formatNumber(sellVal)} ${iconHTML('currency.gold', { size: 'xs', tone: 'gold' })}</button>
            </div>
          `;
          el.querySelector('[data-act="use"]').addEventListener('click', () => callbacks?.onUseConsumable?.(idx));
          el.querySelector('[data-act="sell"]').addEventListener('click', () => callbacks?.onSellItem?.(idx));
        } else {
          const scrapVal = WorldSystems.getSalvageValue(item);
          const upgTag = item.upgradeLevel > 0 ? ` +${item.upgradeLevel}` : '';
          const effStats = WorldSystems.getItemEffectiveStats(item);
          const equipped = state.equipment[item.slot];
          const cmpHtml = this.formatItemComparisonHTML(item, equipped);

          el.innerHTML = `
            <div style="flex:1; padding-right:8px;">
              <strong class="rarity-${item.rarity}" style="font-size:0.84rem;">${iconHTML(itemIconKey, { size: 'sm' })} ${item.name}${upgTag} [${SLOT_NAMES[item.slot]}]</strong>
              <div style="font-size:0.71rem; color:var(--text-secondary);">${this.formatStatsInline(effStats)}</div>
              ${cmpHtml}
            </div>
            <div style="display:flex; flex-direction:column; gap:4px;">
              <button class="btn btn-primary btn-sm" data-act="equip">Equipar</button>
              <button class="btn btn-sm" data-act="sell">Vender +${SafeMath.formatNumber(sellVal)} ${iconHTML('currency.gold', { size: 'xs', tone: 'gold' })}</button>
              <button class="btn btn-sm" data-act="salvage">${iconHTML('actions.salvage', { size: 'xs' })} +${scrapVal} ${iconHTML('currency.scrap', { size: 'xs', tone: 'amber' })}</button>
            </div>
          `;
          el.querySelector('[data-act="equip"]').addEventListener('click', () => callbacks?.onEquipItem?.(idx));
          el.querySelector('[data-act="sell"]').addEventListener('click', () => callbacks?.onSellItem?.(idx));
          el.querySelector('[data-act="salvage"]').addEventListener('click', () => callbacks?.onSalvageItem?.(idx));
        }
        list.appendChild(el);
      });
    } else {
      list.innerHTML = `
        <div style="background:var(--bg-elevated); padding:8px 10px; border-radius:8px; margin-bottom:10px; display:flex; justify-content:space-between; font-size:0.8rem;">
          <span>${iconHTML('currency.scrap', { size: 'sm', tone: 'amber' })} Sucata Arcana: <strong>${SafeMath.formatNumber(state.materials.scrap)}</strong></span>
          <span>${iconHTML('currency.lunarShard', { size: 'sm', tone: 'soul' })} Frag. Lunares: <strong>${SafeMath.formatNumber(state.materials.lunarShards)}</strong></span>
        </div>
      `;

      ['weapon', 'armor', 'relic'].forEach(slot => {
        const item = state.equipment[slot];
        const card = document.createElement('div');
        card.className = 'target-card';
        card.style.flexDirection = 'column';
        card.style.alignItems = 'stretch';

        if (!item) {
          card.innerHTML = `<div style="font-size:0.78rem; color:var(--text-muted);">${SLOT_NAMES[slot]}: Nenhum item equipado</div>`;
          list.appendChild(card);
          return;
        }

        const upgCost = WorldSystems.getForgeUpgradeCost(item, state);
        const maxUpg = item.upgradeLevel >= GameConfig.curves.maxUpgradeLevel;
        const maxRuneSlots = WorldSystems.getItemRuneSlots(item, state);
        const equippedRunes = item.runes || [];
        const itemIconKey = item.iconKey || `items.${slot}`;
        const upgDisabled = maxUpg || state.materials.scrap < upgCost.scrap || state.gold < upgCost.gold;

        const runesHtml = Array.from({ length: maxRuneSlots }).map((_, rIdx) => {
          const rId = equippedRunes[rIdx];
          if (rId) {
            const rMeta = GameConfig.runeCatalog.find(r => r.id === rId);
            return `<button class="btn btn-sm" data-rem-rune="${rIdx}" style="border-color:#c084fc;">${iconHTML(rMeta.iconKey, { size: 'xs', tone: 'soul' })} ${rMeta.name} (✕)</button>`;
          }
          return `<button class="btn btn-sm" data-add-rune="${rIdx}" ${state.runes.length === 0 ? 'disabled' : ''}>+ Encaixar Runa</button>`;
        }).join(' ');

        card.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong class="rarity-${item.rarity}" style="font-size:0.85rem;">${iconHTML(itemIconKey, { size: 'sm' })} ${item.name} (+${item.upgradeLevel})</strong>
            <button class="btn btn-gold btn-sm" data-upg="1" ${upgDisabled ? 'disabled' : ''}>
              ${maxUpg ? 'MÁX' : `${iconHTML('nav.market', { size: 'xs', disabled: upgDisabled })} +1 (${upgCost.scrap}${iconHTML('currency.scrap', { size: 'xs', tone: 'amber', disabled: upgDisabled })} / ${SafeMath.formatNumber(upgCost.gold)}${iconHTML('currency.gold', { size: 'xs', tone: 'gold', disabled: upgDisabled })})`}
            </button>
          </div>
          <div style="font-size:0.71rem; color:var(--text-secondary); margin:4px 0;">
            Slots de Runa (${equippedRunes.length}/${maxRuneSlots}): ${maxRuneSlots === 0 ? 'Item Comum/Incomum não aceita runas' : ''}
          </div>
          <div style="display:flex; flex-wrap:wrap; gap:4px;">${runesHtml}</div>
        `;

        card.querySelector('[data-upg]').addEventListener('click', () => callbacks?.onForgeUpgrade?.(slot));
        card.querySelectorAll('[data-add-rune]').forEach(btn => {
          btn.addEventListener('click', () => callbacks?.onSocketRune?.(slot));
        });
        card.querySelectorAll('[data-rem-rune]').forEach(btn => {
          btn.addEventListener('click', () => callbacks?.onUnsocketRune?.(slot, Number(btn.dataset.remRune)));
        });

        list.appendChild(card);
      });

      const runeBox = document.createElement('div');
      runeBox.style.marginTop = '10px';
      runeBox.innerHTML = `<div style="font-size:0.8rem; font-weight:700; margin-bottom:6px;">Runas na Bolsa (${state.runes.length}):</div>` +
        (state.runes.length === 0
          ? `<div style="font-size:0.73rem; color:var(--text-muted);">Envie esquadrões em Expedições para obter Runas.</div>`
          : state.runes.map(r => `<div style="font-size:0.74rem; padding:4px 0; border-bottom:1px dashed rgba(255,255,255,0.06);">${iconHTML(r.iconKey || 'subtabs.abyss', { size: 'xs', tone: 'soul' })} <strong>${r.name}</strong>: ${r.desc}</div>`).join('')
        );
      list.appendChild(runeBox);
    }
  },

  createSellableInventoryCard(item, idx, callbacks) {
    const el = document.createElement('div');
    el.className = 'item-card';
    const itemIconKey = item.iconKey || (item.type === 'consumable' ? 'items.potionSmall' : `items.${item.slot}`);
    const sellVal = WorldSystems.getItemSellValue(item);
    const upgTag = item.upgradeLevel > 0 ? ` +${item.upgradeLevel}` : '';
    const subInfo = item.type === 'consumable'
      ? (item.desc || 'Consumível')
      : this.formatStatsInline(WorldSystems.getItemEffectiveStats(item));

    el.innerHTML = `
      <div style="flex:1; padding-right:8px;">
        <strong class="${item.rarity ? `rarity-${item.rarity}` : ''}" style="font-size:0.82rem;">${iconHTML(itemIconKey, { size: 'sm' })} ${item.name}${upgTag}</strong>
        <div style="font-size:0.7rem; color:var(--text-secondary);">${subInfo}</div>
      </div>
      <button class="btn btn-sm" data-sell="1">Vender +${SafeMath.formatNumber(sellVal)} ${iconHTML('currency.gold', { size: 'xs', tone: 'gold' })}</button>
    `;
    el.querySelector('[data-sell]').addEventListener('click', () => callbacks?.onSellItem?.(idx));
    return el;
  },

  formatItemComparisonHTML(candidateItem, equippedItem) {
    if (!candidateItem || candidateItem.type === 'consumable') return '';
    const cmp = WorldSystems.compareItemWithEquipped(candidateItem, equippedItem);

    if (!cmp.hasEquipped) {
      return `<div style="font-size:0.69rem; color:var(--success); margin-top:3px;">vs ${SLOT_NAMES[candidateItem.slot]} vazio: <strong>Ganho total (+${SafeMath.formatNumber(cmp.totalScoreDelta)})</strong></div>`;
    }

    const parts = Object.entries(cmp.deltas)
      .filter(([, diff]) => diff !== 0)
      .map(([statKey, diff]) => {
        const sign = diff > 0 ? '+' : '';
        const color = diff > 0 ? 'var(--success)' : 'var(--danger)';
        return `<span style="color:${color}; font-weight:700;">${sign}${SafeMath.formatNumber(diff)} ${STAT_SHORT[statKey]}</span>`;
      });

    const verdict = cmp.totalScoreDelta > 0
      ? `<span style="color:var(--success);">Compensa trocar (+${SafeMath.formatNumber(cmp.totalScoreDelta)})</span>`
      : (cmp.totalScoreDelta < 0
        ? `<span style="color:var(--danger);">Perda geral (${SafeMath.formatNumber(cmp.totalScoreDelta)})</span>`
        : `<span style="color:var(--text-muted);">Equivalente (=)</span>`);

    const deltaText = parts.length > 0 ? parts.join(' • ') : '<span style="color:var(--text-muted);">Sem mudança nos atributos</span>';
    return `<div style="font-size:0.69rem; margin-top:3px;">vs <em>${equippedItem.name}</em>: ${deltaText} — ${verdict}</div>`;
  },

  renderSettingsSection(callbacks) {
    ['stats', 'backup'].forEach(sub => {
      document.getElementById(`subtab-s-${sub}`).classList.toggle('btn-primary', this.settingsSubtab === sub);
      document.getElementById(`panel-s-${sub}`).style.display = this.settingsSubtab === sub ? 'block' : 'none';
    });

    const state = StateManager.state;
    const lt = state.lifetime;
    const achMult = Formulas.getAchievementMultiplier(lt);

    document.getElementById('lifetime-stats-grid').innerHTML = `
      <div>Abates Totais: <strong>${SafeMath.formatNumber(lt.totalKills)}</strong></div>
      <div>Ouro Vitalício: <strong>${SafeMath.formatNumber(lt.totalGoldEarned)}</strong></div>
      <div>Maior Abismo: <strong>Andar ${lt.maxAbyssFloor}</strong></div>
      <div>Expedições: <strong>${lt.expeditionsCompleted}</strong></div>
      <div>Críticos Totais: <strong>${SafeMath.formatNumber(lt.critsLanded)}</strong></div>
      <div>Bônus Conquistas: <strong style="color:var(--success)">+${((achMult - 1) * 100).toFixed(0)}%</strong></div>
    `;

    document.getElementById('achievements-list').innerHTML = GameConfig.achievements.map(ach => {
      const val = lt[ach.statKey] || 0;
      const tier = ach.tiers.filter(t => val >= t).length;
      const next = ach.tiers[tier] || ach.tiers[ach.tiers.length - 1];
      return `
        <div style="display:flex; justify-content:space-between; font-size:0.76rem; padding:5px 0; border-bottom:1px dashed rgba(255,255,255,0.06);">
          <span>${iconHTML(ach.iconKey, { size: 'xs', tone: tier > 0 ? 'gold' : 'muted', active: tier > 0 })} <strong>${ach.name}</strong> (Tier ${tier}/4)</span>
          <span style="color:var(--text-secondary)">${SafeMath.formatNumber(val)} / ${SafeMath.formatNumber(next)}</span>
        </div>
      `;
    }).join('');
  },

  formatStatsInline(stats) {
    const labels = { strength: 'FOR', defense: 'DEF', agility: 'AGI', vitality: 'VIT' };
    return Object.entries(stats || {})
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `+${SafeMath.formatNumber(v)} ${labels[k]}`)
      .join(' • ');
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
