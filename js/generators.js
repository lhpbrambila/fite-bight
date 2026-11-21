/**
 * ============================================================================
 * GENERATORS.JS — GERAÇÃO DE INIMIGOS, CHEFES, EQUIPAMENTOS, MISSÕES E LOJA
 * ============================================================================
 */
import { GameConfig } from './config.js';
import { SafeMath } from './utils.js';

const ENEMY_ARCHETYPES = [
  { name: 'Sentinela Profanada', tier: 'Comum', iconKey: 'combat.target', mult: 0.85 },
  { name: 'Caçador das Sombras', tier: 'Elite', iconKey: 'domain.scout', mult: 1.05 },
  { name: 'Inquisidor Carmesim', tier: 'Veterano', iconKey: 'combat.bleed', mult: 1.25 }
];

const BOSS_ROSTER = [
  { name: 'Lorde Malakor', title: 'Soberano da Catedral Submersa', iconKey: 'combat.boss' },
  { name: 'Fenris, Presa Abissal', title: 'Alfa da Lua Sangrenta', iconKey: 'factions.werewolf' },
  { name: 'Condessa Carmilla', title: 'Matriarca do Véu Eterno', iconKey: 'factions.vampire' },
  { name: 'Azazel, o Arquivista', title: 'Guardião das Runas Proibidas', iconKey: 'subtabs.abyss' }
];

const EQUIP_TEMPLATES = {
  weapon: ['Lâmina Sombria', 'Adaga Ritualística', 'Garras de Obsidiana', 'Ceifadora Carmesim'],
  armor:  ['Sobretudo Gótico', 'Couraça da Noite', 'Manto de Cinzas', 'Armadura Espectral'],
  relic:  ['Cálice de Sangue', 'Amuleto Lunar', 'Grimório Selado', 'Anel do Abismo']
};

export const Generators = {
  rollRarity(dropBonus = 0) {
    const entries = Object.values(GameConfig.rarities);
    const adjusted = entries.map(r => {
      const boost = r.id === 'common' ? 1 : (1 + dropBonus * 1.5);
      return { ...r, adjWeight: r.weight * boost };
    });
    const total = adjusted.reduce((sum, r) => sum + r.adjWeight, 0);
    let roll = Math.random() * total;
    for (const r of adjusted) {
      roll -= r.adjWeight;
      if (roll <= 0) return r;
    }
    return GameConfig.rarities.common;
  },

  generateEquipment(level, forcedRarity = null, dropBonus = 0) {
    const lvl = SafeMath.int(level, 1, 100000);
    const slots = ['weapon', 'armor', 'relic'];
    const slot = slots[Math.floor(Math.random() * slots.length)];
    const rarity = forcedRarity || this.rollRarity(dropBonus);
    const names = EQUIP_TEMPLATES[slot];
    const baseName = names[Math.floor(Math.random() * names.length)];

    const powerBudget = SafeMath.int((3 + lvl * 2.2) * rarity.mult, 2);
    const stats = { strength: 0, defense: 0, agility: 0, vitality: 0 };

    if (slot === 'weapon') {
      stats.strength = SafeMath.int(powerBudget * 0.75, 1);
      stats.agility = SafeMath.int(powerBudget * 0.35, 0);
    } else if (slot === 'armor') {
      stats.defense = SafeMath.int(powerBudget * 0.70, 1);
      stats.vitality = SafeMath.int(powerBudget * 0.45, 1);
    } else {
      stats.agility = SafeMath.int(powerBudget * 0.45, 1);
      stats.vitality = SafeMath.int(powerBudget * 0.45, 1);
      stats.strength = SafeMath.int(powerBudget * 0.25, 0);
    }

    const price = SafeMath.int((25 + lvl * 18) * rarity.priceMult, 15);

    return {
      uid: `eq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: 'equipment',
      slot,
      name: `${baseName} Nv.${lvl}`,
      iconKey: `items.${slot}`,
      rarity: rarity.id,
      rarityName: rarity.name,
      level: lvl,
      upgradeLevel: 0,
      runes: [],
      stats,
      price
    };
  },

  generateShopStock(playerLevel) {
    const stock = GameConfig.consumables.map(c => ({ ...c }));
    for (let i = 0; i < 4; i++) {
      stock.push(this.generateEquipment(playerLevel));
    }
    return stock;
  },

  generateHuntTargets(playerLevel) {
    const lvl = SafeMath.int(playerLevel, 1);
    return ENEMY_ARCHETYPES.map((arch, idx) => {
      const targetLvl = Math.max(1, lvl + idx - 1);
      const base = SafeMath.int((5 + targetLvl * 3.2) * arch.mult, 3);
      return {
        id: `hunt_${idx}_${Date.now()}`,
        isBoss: false,
        name: arch.name,
        tier: arch.tier,
        iconKey: arch.iconKey,
        level: targetLvl,
        difficultyLabel: idx === 0 ? 'Moderado' : (idx === 1 ? 'Desafiador' : 'Perigoso'),
        stats: {
          strength: base,
          defense: SafeMath.int(base * 0.85, 2),
          agility: SafeMath.int(base * 0.8, 2),
          vitality: SafeMath.int(base * 1.1, 3)
        }
      };
    });
  },

  generateMilestoneBoss(bossesDefeated = 0) {
    const idx = bossesDefeated % BOSS_ROSTER.length;
    const meta = BOSS_ROSTER[idx];
    const level = (bossesDefeated + 1) * 5;
    const base = SafeMath.int(14 + Math.pow(level, 1.32) * 4.5, 12);

    return {
      id: `boss_${bossesDefeated + 1}`,
      isBoss: true,
      name: meta.name,
      title: meta.title,
      tier: 'CHEFE',
      iconKey: meta.iconKey,
      level,
      stats: {
        strength: base,
        defense: SafeMath.int(base * 0.95, 8),
        agility: SafeMath.int(base * 0.75, 6),
        vitality: SafeMath.int(base * 1.5, 15)
      }
    };
  },

  generateQuests(playerLevel) {
    const lvl = SafeMath.int(playerLevel, 1);
    return [
      {
        id: 'q_kills',
        type: 'kills',
        title: 'Expurgo Noturno',
        iconKey: 'nav.hunt',
        desc: 'Derrote criaturas nas caçadas ou no Abismo.',
        progress: 0,
        target: 5 + Math.floor(lvl * 0.5),
        rewardGold: SafeMath.int(60 + lvl * 25, 50),
        rewardXp: SafeMath.int(45 + lvl * 20, 40)
      },
      {
        id: 'q_crits',
        type: 'crits',
        title: 'Golpes Precisos',
        iconKey: 'combat.skill',
        desc: 'Acerte golpes críticos em combate.',
        progress: 0,
        target: 4 + Math.floor(lvl * 0.4),
        rewardGold: SafeMath.int(75 + lvl * 30, 60),
        rewardXp: SafeMath.int(55 + lvl * 22, 45)
      }
    ];
  }
};
