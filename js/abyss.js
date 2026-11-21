/**
 * ============================================================================
 * ABYSS.JS — MASMORRA INFINITA (O ABISMO) E BESTIÁRIO PERMANENTE
 * ============================================================================
 */
import { SafeMath } from './utils.js';

export const ABYSS_SPECIES = [
  { id: 'abyss_wraith',   name: 'Aparição do Véu',     iconKey: 'abyssSpecies.abyss_wraith',  bonusType: 'gold', desc: '+2% Ouro global por marco' },
  { id: 'abyss_hound',    name: 'Cão das Profundezas', iconKey: 'abyssSpecies.abyss_hound',   bonusType: 'crit', desc: '+1% Chance Crítica por marco' },
  { id: 'abyss_golem',    name: 'Colosso de Obsidiana',iconKey: 'abyssSpecies.abyss_golem',   bonusType: 'def',  desc: '+3% Defesa efetiva por marco' },
  { id: 'abyss_vampire',  name: 'Nobre Caído',         iconKey: 'abyssSpecies.abyss_vampire', bonusType: 'dmg',  desc: '+3% Dano efetivo por marco' },
  { id: 'abyss_horror',   name: 'Horror Cósmico',      iconKey: 'abyssSpecies.abyss_horror',  bonusType: 'xp',   desc: '+2% XP global por marco' }
];

const MINI_BOSS_MECHANICS = [
  {
    id: 'obsidian_shell',
    name: 'Carapaça de Obsidiana',
    desc: 'Imune a acertos Críticos. Favorece Sangramento e Força bruta.'
  },
  {
    id: 'soul_leech',
    name: 'Sanguessuga Abissal',
    desc: 'Drena 8% do HP máximo do jogador por turno.'
  },
  {
    id: 'dark_mirror',
    name: 'Espelho Sombrio',
    desc: 'Reflete 18% do dano direto recebido de volta ao atacante.'
  }
];

export const BESTIARY_MILESTONES = [100, 1000, 10000, 50000];

export const AbyssEngine = {
  generateFloorEnemy(floor) {
    const f = SafeMath.int(floor, 1, 1000000);
    const isMiniBoss = f % 10 === 0;
    const species = ABYSS_SPECIES[(f - 1) % ABYSS_SPECIES.length];

    const baseStat = SafeMath.int(8 * Math.pow(f, 1.18), 6);
    const bossMult = isMiniBoss ? 1.55 : 1.0;

    let mechanic = null;
    if (isMiniBoss) {
      const mechIdx = (Math.floor(f / 10) - 1) % MINI_BOSS_MECHANICS.length;
      mechanic = MINI_BOSS_MECHANICS[mechIdx];
    }

    return {
      id: `abyss_f${f}`,
      speciesId: species.id,
      isBoss: isMiniBoss,
      isAbyss: true,
      floor: f,
      name: isMiniBoss ? `[Guardião A${f}] ${species.name}` : `${species.name} (Andar ${f})`,
      iconKey: isMiniBoss ? 'abyssSpecies.miniBoss' : species.iconKey,
      tier: isMiniBoss ? 'MINI-CHEFE' : 'Abismo',
      level: f,
      difficultyLabel: isMiniBoss ? 'Mortal' : 'Abissal',
      mechanic,
      stats: {
        strength: SafeMath.int(baseStat * bossMult, 4),
        defense:  SafeMath.int(baseStat * 0.95 * bossMult, 4),
        agility:  SafeMath.int(baseStat * 0.85 * bossMult, 4),
        vitality: SafeMath.int(baseStat * 1.25 * bossMult, 5)
      }
    };
  },

  getBestiaryBonuses(bestiaryState = {}) {
    const bonuses = { gold: 0, crit: 0, def: 0, dmg: 0, xp: 0 };

    ABYSS_SPECIES.forEach(sp => {
      const kills = bestiaryState[sp.id] || 0;
      const tiersUnlocked = BESTIARY_MILESTONES.filter(m => kills >= m).length;
      if (tiersUnlocked > 0) {
        if (sp.bonusType === 'gold') bonuses.gold += tiersUnlocked * 0.02;
        if (sp.bonusType === 'crit') bonuses.crit += tiersUnlocked * 0.01;
        if (sp.bonusType === 'def')  bonuses.def  += tiersUnlocked * 0.03;
        if (sp.bonusType === 'dmg')  bonuses.dmg  += tiersUnlocked * 0.03;
        if (sp.bonusType === 'xp')   bonuses.xp   += tiersUnlocked * 0.02;
      }
    });

    return bonuses;
  }
};
