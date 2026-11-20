/**
 * ============================================================================
 * COMBAT.JS — COMBATE TÁTICO COM HABILIDADES, COOLDOWNS E EFEITOS DE STATUS
 * ============================================================================
 */
import { GameConfig } from './config.js';
import { Formulas } from './formulas.js';
import { Generators } from './generators.js';
import { SafeMath } from './utils.js';

export const CombatEngine = {
  simulateBattle(playerState, enemy) {
    const pEff = Formulas.getEffectiveStats(playerState);
    const pProfile = Formulas.getCombatProfile(pEff, playerState.level);
    const eProfile = Formulas.getCombatProfile(enemy.stats, enemy.level);
    const pMult = Formulas.getPrestigeMultipliers(playerState.prestige);

    let pHp = SafeMath.int(playerState.currentHp, 1, pProfile.maxHp);
    let eHp = eProfile.maxHp;

    // Prepara habilidades da facção com cooldown reduzido pelo Prestígio
    const rawSkills = GameConfig.skills[playerState.faction] || GameConfig.skills.vampire;
    const skills = rawSkills.map(sk => ({
      ...sk,
      effectiveCd: Math.max(2, sk.cooldown - pMult.cdReduction),
      currentCd: 0
    }));

    // Estados temporários de batalha
    let enemyBleedTurns = 0;
    let enemyBleedDmg = 0;
    let playerFrenzyTurns = 0;

    const logs = [];
    const tag = enemy.isBoss ? `👑 <strong>[CHEFE]</strong> ` : `⚔️ `;
    logs.push(`${tag}<strong>${playerState.name}</strong> (HP ${SafeMath.formatNumber(pHp)}) vs <strong>${enemy.name}</strong> (HP ${SafeMath.formatNumber(eHp)})`);

    let turn = 1;
    const maxTurns = enemy.isBoss ? 25 : 18;

    while (pHp > 0 && eHp > 0 && turn <= maxTurns) {
      // 1. Efeitos contínuos no início do turno (Sangramento no inimigo)
      if (enemyBleedTurns > 0) {
        eHp = Math.max(0, eHp - enemyBleedDmg);
        enemyBleedTurns--;
        logs.push(`<span class="log-bleed">🩸 T${turn}: ${enemy.name} sofre ${enemyBleedDmg} de Sangramento (HP alvo: ${eHp}).</span>`);
        if (eHp <= 0) break;
      }

      // 2. Turno do Jogador: verifica se alguma habilidade está pronta
      const readySkill = skills.find(s => s.currentCd === 0);
      if (readySkill) {
        readySkill.currentCd = readySkill.effectiveCd;
        const skillRes = this.executePlayerSkill(readySkill, playerState.name, pEff, pProfile, pHp, enemy.name, eProfile);
        eHp = Math.max(0, eHp - skillRes.damage);
        pHp = Math.min(pProfile.maxHp, pHp + skillRes.heal);
        if (skillRes.bleedTurns > 0) {
          enemyBleedTurns = skillRes.bleedTurns;
          enemyBleedDmg = skillRes.bleedDmg;
        }
        if (skillRes.frenzyTurns > 0) {
          playerFrenzyTurns = skillRes.frenzyTurns;
        }
        logs.push(`<span class="log-skill">✨ T${turn}: ${skillRes.text} (HP alvo: ${eHp})</span>`);
      } else {
        const dmgBonus = playerFrenzyTurns > 0 ? 1.45 : 1.0;
        const pHit = this.resolveStrike(playerState.name, pProfile, enemy.name, eProfile, dmgBonus);
        eHp = Math.max(0, eHp - pHit.damage);
        logs.push(`T${turn}: ${pHit.text} (HP alvo: ${eHp})`);
      }

      // Reduz cooldowns e duração de buffs
      skills.forEach(s => { if (s.currentCd > 0) s.currentCd--; });
      if (playerFrenzyTurns > 0) playerFrenzyTurns--;

      if (eHp <= 0) break;

      // 3. Turno do Inimigo
      const eHit = this.resolveStrike(enemy.name, eProfile, playerState.name, pProfile, 1.0);
      pHp = Math.max(0, pHp - eHit.damage);
      logs.push(`T${turn}: ${eHit.text} (Seu HP: ${pHp})`);

      turn++;
    }

    const won = pHp > eHp;
    let rewardGold = 0;
    let rewardXp = 0;
    let droppedItem = null;

    if (won) {
      const tierMult = enemy.isBoss ? 3.5 : (enemy.difficultyLabel === 'Perigoso' ? 1.35 : (enemy.difficultyLabel === 'Fácil' ? 0.8 : 1.0));
      rewardGold = SafeMath.int((16 + enemy.level * 12 + Math.random() * 10) * tierMult * pMult.goldMult, 5);
      rewardXp = SafeMath.int((14 + enemy.level * 10) * tierMult * pMult.xpMult, 5);

      logs.push(`<span class="log-win">🏆 Vitória! +${SafeMath.formatNumber(rewardGold)} Ouro e +${SafeMath.formatNumber(rewardXp)} XP.</span>`);

      const dropChance = enemy.isBoss ? 0.85 : Math.min(0.65, 0.28 + pMult.dropBonus);
      if (Math.random() < dropChance) {
        const forcedRarity = enemy.isBoss ? GameConfig.rarities.rare : null;
        droppedItem = Generators.generateEquipment(enemy.level, forcedRarity, pMult.dropBonus);
        logs.push(`<span class="log-drop">🎁 Drop: ${droppedItem.icon} ${droppedItem.name} (${droppedItem.rarityName})!</span>`);
      }
    } else {
      rewardXp = SafeMath.int(Math.max(2, enemy.level * 2) * pMult.xpMult, 2);
      pHp = Math.max(1, pHp);
      logs.push(`<span class="log-lose">💀 Derrota! Você recuou ferido (+${rewardXp} XP).</span>`);
    }

    return { won, remainingHp: pHp, rewardGold, rewardXp, droppedItem, logs };
  },

  executePlayerSkill(skill, pName, pEff, pProfile, currentHp, eName, eProfile) {
    const baseRoll = pProfile.minDmg + Math.floor(Math.random() * (pProfile.maxDmg - pProfile.minDmg + 1));

    if (skill.id === 'crimson_bite') {
      const dmg = Math.max(2, Math.floor(baseRoll * 1.5) - Math.floor(eProfile.armor * 0.4));
      const heal = Math.max(1, Math.floor(dmg * 0.45));
      return {
        damage: dmg,
        heal,
        bleedTurns: 0,
        bleedDmg: 0,
        frenzyTurns: 0,
        text: `${pName} usou <strong>${skill.name}</strong> causando <strong>${dmg}</strong> de dano e drenando <strong>+${heal} HP</strong>!`
      };
    }

    if (skill.id === 'hemorrhage') {
      const bleedDmg = Math.max(2, Math.floor(pEff.strength * 0.45));
      return {
        damage: Math.max(1, Math.floor(baseRoll * 0.8)),
        heal: 0,
        bleedTurns: 3,
        bleedDmg,
        frenzyTurns: 0,
        text: `${pName} lançou <strong>${skill.name}</strong>! ${eName} sangrará ${bleedDmg}/turno por 3 turnos.`
      };
    }

    if (skill.id === 'lunar_frenzy') {
      const dmg = Math.max(2, baseRoll - Math.floor(eProfile.armor * 0.5));
      return {
        damage: dmg,
        heal: 0,
        bleedTurns: 0,
        bleedDmg: 0,
        frenzyTurns: 3,
        text: `${pName} ativou <strong>${skill.name}</strong> (+45% dano por 3 turnos) e golpeou por <strong>${dmg}</strong>!`
      };
    }

    // rending_claws
    const dmg = Math.max(3, Math.floor(baseRoll * 1.65) - Math.floor(eProfile.armor * 0.45));
    const bleedDmg = Math.max(2, Math.floor(pEff.strength * 0.35));
    return {
      damage: dmg,
      heal: 0,
      bleedTurns: 2,
      bleedDmg,
      frenzyTurns: 0,
      text: `${pName} desferiu <strong>${skill.name}</strong> por <strong>${dmg}</strong> de dano + Sangramento (${bleedDmg}/turno)!`
    };
  },

  resolveStrike(atkName, atkProfile, defName, defProfile, dmgMult = 1.0) {
    if (Math.random() < defProfile.dodgeChance) {
      return {
        damage: 0,
        text: `<span class="log-dodge">${defName} esquivou do golpe de ${atkName}!</span>`
      };
    }

    let rawDmg = (atkProfile.minDmg + Math.floor(Math.random() * (atkProfile.maxDmg - atkProfile.minDmg + 1))) * dmgMult;
    const isCrit = Math.random() < atkProfile.critChance;
    if (isCrit) rawDmg *= 1.65;

    const finalDmg = Math.max(1, Math.floor(rawDmg) - Math.floor(defProfile.armor * 0.58));
    const critLabel = isCrit ? ` <span class="log-crit">[CRÍTICO!]</span>` : '';

    return {
      damage: finalDmg,
      text: `${atkName} causou <strong>${finalDmg}</strong> de dano em ${defName}${critLabel}.`
    };
  }
};
