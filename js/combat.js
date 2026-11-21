/**
 * ============================================================================
 * COMBAT.JS — COMBATE TÁTICO V4 (RUNAS, ABISMO, LUA E RESTRIÇÕES DE DESAFIO)
 * ============================================================================
 */
import { GameConfig } from './config.js';
import { Formulas } from './formulas.js';
import { Generators } from './generators.js';
import { WorldSystems } from './systems.js';
import { SafeMath } from './utils.js';
import { iconHTML } from './icons.js';

export const CombatEngine = {
  simulateBattle(playerState, enemy) {
    const pEff = Formulas.getEffectiveStats(playerState);
    const pProfile = Formulas.getCombatProfile(pEff, playerState.level, playerState);
    const eProfile = Formulas.getCombatProfile(enemy.stats, enemy.level);
    const pMult = Formulas.getPrestigeMultipliers(playerState);
    const moon = WorldSystems.getCurrentMoonPhase();
    const activeRunes = WorldSystems.getActiveRuneIds(playerState);

    const noHealChallenge = playerState.challenges?.active === 'blood_thirst';
    const isEclipseChallenge = playerState.challenges?.active === 'eternal_eclipse';

    // Modificadores de Lua e Runas
    const isFullMoon = moon.id === 'full_moon';
    const moonDmgMult = (isFullMoon && playerState.faction === 'werewolf') ? 1.30 : moon.dmgMult;
    const moonVampMult = (isFullMoon && playerState.faction === 'vampire') ? 1.30 : 1.0;

    const abyssRuneCount = activeRunes.filter(r => r === 'rune_abyss').length;
    const bossRuneMult = (enemy.isBoss && abyssRuneCount > 0) ? (1 + 0.25 * abyssRuneCount) : 1.0;

    const crimsonRuneCount = activeRunes.filter(r => r === 'rune_crimson').length;

    let pHp = SafeMath.int(playerState.currentHp, 1, pProfile.maxHp);
    let eHp = eProfile.maxHp;

    const rawSkills = GameConfig.skills[playerState.faction] || GameConfig.skills.vampire;
    const skills = rawSkills.map(sk => ({
      ...sk,
      effectiveCd: Math.max(2, sk.cooldown - pMult.cdReduction),
      currentCd: 0
    }));

    let enemyBleedTurns = 0;
    let enemyBleedDmg = 0;
    let playerFrenzyTurns = 0;
    let critsLanded = 0;

    const logs = [];
    const tag = enemy.isBoss
      ? `${iconHTML('combat.boss', { size: 'xs', tone: 'gold' })}<strong>[${enemy.tier}]</strong> `
      : `${iconHTML('nav.hunt', { size: 'xs' })}`;
    logs.push(`${tag}<strong>${playerState.name}</strong> (HP ${SafeMath.formatNumber(pHp)}) vs <strong>${enemy.name}</strong> (HP ${SafeMath.formatNumber(eHp)})`);
    if (enemy.mechanic) {
      logs.push(`<span class="log-bleed">${iconHTML('combat.warning', { size: 'xs', tone: 'amber' })}Mecânica: ${enemy.mechanic.name} — ${enemy.mechanic.desc}</span>`);
    }

    let turn = 1;
    const maxTurns = enemy.isBoss ? 28 : 20;

    while (pHp > 0 && eHp > 0 && turn <= maxTurns) {
      // 1. Sangramento no início do turno
      if (enemyBleedTurns > 0) {
        const bleedHit = SafeMath.int(enemyBleedDmg * moonVampMult, 1);
        eHp = Math.max(0, eHp - bleedHit);
        enemyBleedTurns--;
        logs.push(`<span class="log-bleed">${iconHTML('combat.bleed', { size: 'xs', tone: 'hp' })}T${turn}: ${enemy.name} sofre ${SafeMath.formatNumber(bleedHit)} de Sangramento.</span>`);
        if (eHp <= 0) break;
      }

      // 2. Turno do Jogador
      const readySkill = skills.find(s => s.currentCd === 0);
      let playerDealt = 0;

      if (readySkill) {
        readySkill.currentCd = readySkill.effectiveCd;
        const skillRes = this.executePlayerSkill(
          readySkill, playerState.name, pEff, pProfile, enemy.name, eProfile,
          moonDmgMult * bossRuneMult, moonVampMult, noHealChallenge
        );
        playerDealt = skillRes.damage;
        eHp = Math.max(0, eHp - skillRes.damage);
        pHp = Math.min(pProfile.maxHp, pHp + skillRes.heal);
        if (skillRes.bleedTurns > 0) {
          enemyBleedTurns = skillRes.bleedTurns;
          enemyBleedDmg = skillRes.bleedDmg;
        }
        if (skillRes.frenzyTurns > 0) {
          playerFrenzyTurns = skillRes.frenzyTurns;
        }
        logs.push(`<span class="log-skill">${iconHTML('combat.skill', { size: 'xs', tone: 'soul' })}T${turn}: ${skillRes.text} (HP alvo: ${SafeMath.formatNumber(eHp)})</span>`);
      } else {
        const frenzyMult = playerFrenzyTurns > 0 ? 1.45 : 1.0;
        const allowCrit = enemy.mechanic?.id !== 'obsidian_shell';
        const pHit = this.resolveStrike(
          playerState.name, pProfile, enemy.name, eProfile,
          frenzyMult * moonDmgMult * bossRuneMult, allowCrit
        );
        playerDealt = pHit.damage;
        eHp = Math.max(0, eHp - pHit.damage);
        logs.push(`T${turn}: ${pHit.text} (HP alvo: ${SafeMath.formatNumber(eHp)})`);

        if (pHit.isCrit) {
          critsLanded++;
          if (crimsonRuneCount > 0) {
            skills.forEach(s => { if (s.currentCd > 0) s.currentCd--; });
            if (!noHealChallenge) {
              const runeHeal = SafeMath.int(pProfile.maxHp * 0.08 * crimsonRuneCount, 1);
              pHp = Math.min(pProfile.maxHp, pHp + runeHeal);
              logs.push(`<span class="log-skill">${iconHTML('combat.bleed', { size: 'xs', tone: 'hp' })}Runa Sanguínea: +${SafeMath.formatNumber(runeHeal)} HP e -1 recarga!</span>`);
            }
          }
        }
      }

      // Mecânica Espelho Sombrio (reflete 18% do dano)
      if (enemy.mechanic?.id === 'dark_mirror' && playerDealt > 0) {
        const reflected = SafeMath.int(playerDealt * 0.18, 1);
        pHp = Math.max(0, pHp - reflected);
        logs.push(`<span class="log-bleed">${iconHTML('combat.mirror', { size: 'xs', tone: 'soul' })}Espelho Sombrio refletiu ${reflected} de dano!</span>`);
      }

      skills.forEach(s => { if (s.currentCd > 0) s.currentCd--; });
      if (playerFrenzyTurns > 0) playerFrenzyTurns--;

      if (eHp <= 0 || pHp <= 0) break;

      // 3. Turno do Inimigo
      const enemyDmgMult = isEclipseChallenge ? 1.35 : 1.0;
      const eHit = this.resolveStrike(enemy.name, eProfile, playerState.name, pProfile, enemyDmgMult, true);
      pHp = Math.max(0, pHp - eHit.damage);
      logs.push(`T${turn}: ${eHit.text} (Seu HP: ${SafeMath.formatNumber(pHp)})`);

      // Mecânica Sanguessuga Abissal
      if (enemy.mechanic?.id === 'soul_leech' && pHp > 0) {
        const drain = SafeMath.int(pProfile.maxHp * 0.08, 1);
        pHp = Math.max(0, pHp - drain);
        eHp = Math.min(eProfile.maxHp, eHp + drain);
        logs.push(`<span class="log-bleed">${iconHTML('factions.vampire', { size: 'xs', tone: 'crimson' })}Sanguessuga Abissal drenou ${drain} HP!</span>`);
      }

      turn++;
    }

    const won = pHp > eHp;
    let rewardGold = 0;
    let rewardXp = 0;
    let rewardScrap = 0;
    let droppedItem = null;

    if (won) {
      const tierMult = enemy.isBoss ? 3.2 : (enemy.isAbyss ? 1.2 : 1.0);
      rewardGold = SafeMath.int((16 + enemy.level * 12 + Math.random() * 10) * tierMult * pMult.goldMult, 5);
      rewardXp = SafeMath.int((14 + enemy.level * 10) * tierMult * pMult.xpMult * moon.xpMult, 5);
      if (enemy.isAbyss) {
        rewardScrap = SafeMath.int(2 + Math.floor(enemy.level * 0.6), 1);
      }

      const scrapSnippet = rewardScrap > 0
        ? ` • +${rewardScrap} ${iconHTML('currency.scrap', { size: 'xs', tone: 'amber' })}`
        : '';
      logs.push(`<span class="log-win">${iconHTML('combat.win', { size: 'xs', tone: 'gold' })}Vitória! +${SafeMath.formatNumber(rewardGold)} Ouro • +${SafeMath.formatNumber(rewardXp)} XP${scrapSnippet}.</span>`);

      const baseDrop = enemy.isBoss ? 0.85 : Math.min(0.65, 0.26 + pMult.dropBonus);
      const dropChance = Math.min(0.95, baseDrop * moon.dropMult);

      if (Math.random() < dropChance) {
        const forcedRarity = enemy.isBoss ? GameConfig.rarities.rare : null;
        droppedItem = Generators.generateEquipment(enemy.level, forcedRarity, pMult.dropBonus);
        const itemIconKey = droppedItem.iconKey || `items.${droppedItem.slot}`;
        logs.push(`<span class="log-drop">${iconHTML('combat.drop', { size: 'xs', tone: 'soul' })}Drop: ${iconHTML(itemIconKey, { size: 'xs' })}${droppedItem.name} (${droppedItem.rarityName})!</span>`);
      }
    } else {
      rewardXp = SafeMath.int(Math.max(2, enemy.level * 2) * pMult.xpMult, 2);
      pHp = Math.max(1, pHp);
      logs.push(`<span class="log-lose">${iconHTML('combat.lose', { size: 'xs', tone: 'muted' })}Derrota! Você recuou ferido (+${rewardXp} XP).</span>`);
    }

    return { won, remainingHp: pHp, rewardGold, rewardXp, rewardScrap, droppedItem, critsLanded, logs };
  },

  executePlayerSkill(skill, pName, pEff, pProfile, eName, eProfile, dmgMult, vampMult, noHeal) {
    const baseRoll = (pProfile.minDmg + Math.floor(Math.random() * (pProfile.maxDmg - pProfile.minDmg + 1))) * dmgMult;

    if (skill.id === 'crimson_bite') {
      const dmg = Math.max(2, Math.floor(baseRoll * 1.5) - Math.floor(eProfile.armor * 0.4));
      const heal = noHeal ? 0 : Math.max(1, Math.floor(dmg * 0.45 * vampMult));
      const healText = noHeal ? ' (cura bloqueada!)' : ` e drenando <strong>+${SafeMath.formatNumber(heal)} HP</strong>`;
      return {
        damage: dmg, heal, bleedTurns: 0, bleedDmg: 0, frenzyTurns: 0,
        text: `${pName} usou <strong>${skill.name}</strong> causando <strong>${SafeMath.formatNumber(dmg)}</strong>${healText}!`
      };
    }

    if (skill.id === 'hemorrhage') {
      const bleedDmg = Math.max(2, Math.floor(pEff.strength * 0.45 * vampMult));
      return {
        damage: Math.max(1, Math.floor(baseRoll * 0.8)), heal: 0, bleedTurns: 3, bleedDmg, frenzyTurns: 0,
        text: `${pName} lançou <strong>${skill.name}</strong>! ${eName} sangrará ${SafeMath.formatNumber(bleedDmg)}/turno por 3 turnos.`
      };
    }

    if (skill.id === 'lunar_frenzy') {
      const dmg = Math.max(2, Math.floor(baseRoll) - Math.floor(eProfile.armor * 0.5));
      return {
        damage: dmg, heal: 0, bleedTurns: 0, bleedDmg: 0, frenzyTurns: 3,
        text: `${pName} ativou <strong>${skill.name}</strong> (+45% dano por 3 turnos) e golpeou por <strong>${SafeMath.formatNumber(dmg)}</strong>!`
      };
    }

    const dmg = Math.max(3, Math.floor(baseRoll * 1.65) - Math.floor(eProfile.armor * 0.45));
    const bleedDmg = Math.max(2, Math.floor(pEff.strength * 0.35));
    return {
      damage: dmg, heal: 0, bleedTurns: 2, bleedDmg, frenzyTurns: 0,
      text: `${pName} desferiu <strong>${skill.name}</strong> por <strong>${SafeMath.formatNumber(dmg)}</strong> + Sangramento (${SafeMath.formatNumber(bleedDmg)}/turno)!`
    };
  },

  resolveStrike(atkName, atkProfile, defName, defProfile, dmgMult = 1.0, allowCrit = true) {
    if (Math.random() < defProfile.dodgeChance) {
      return {
        damage: 0, isCrit: false,
        text: `<span class="log-dodge">${defName} esquivou do golpe de ${atkName}!</span>`
      };
    }

    let rawDmg = (atkProfile.minDmg + Math.floor(Math.random() * (atkProfile.maxDmg - atkProfile.minDmg + 1))) * dmgMult;
    const isCrit = allowCrit && (Math.random() < atkProfile.critChance);
    if (isCrit) rawDmg *= (atkProfile.critDamageMult || 1.65);

    const finalDmg = Math.max(1, Math.floor(rawDmg) - Math.floor(defProfile.armor * 0.58));
    const critLabel = isCrit ? ` <span class="log-crit">[CRÍTICO!]</span>` : '';

    return {
      damage: finalDmg, isCrit,
      text: `${atkName} causou <strong>${SafeMath.formatNumber(finalDmg)}</strong> de dano em ${defName}${critLabel}.`
    };
  }
};
