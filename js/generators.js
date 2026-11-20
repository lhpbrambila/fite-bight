/**
 * ============================================================================
 * GENERATORS.JS — INIMIGOS (220+), CHEFES DE MARCO, MISSÕES E EQUIPAMENTOS
 * ============================================================================
 */
import { GameConfig } from './config.js';
import { SafeMath } from './utils.js';

const ENEMY_ARCHETYPES = [
  { name: 'Aldeão Armado',        icon: '🧑‍🌾', tier: 'Humano' },
  { name: 'Guarda da Vigília',    icon: '💂', tier: 'Humano' },
  { name: 'Caçador de Bruxas',    icon: '🏹', tier: 'Humano' },
  { name: 'Inquisidor Fanático',  icon: '✝️', tier: 'Humano' },
  { name: 'Lobo Atroz',           icon: '🐺', tier: 'Fera' },
  { name: 'Morcego Gigante',      icon: '🦇', tier: 'Fera' },
  { name: 'Gárgula de Granito',   icon: '🗿', tier: 'Criatura' },
  { name: 'Espectro Errante',     icon: '👻', tier: 'Morto-Vivo' },
  { name: 'Carniçal Faminto',     icon: '🧟', tier: 'Morto-Vivo' },
  { name: 'Cavaleiro Profano',    icon: '💀', tier: 'Elite' }
];

const ENEMY_EPITHETS = [
  'Errante', 'Sombrio', 'Faminto', 'Cicatrizado', 'Noturno',
  'Implacável', 'Maldito', 'Sangrento', 'Pálido', 'Feroz',
  'Vingativo', 'Corrompido', 'Silencioso', 'Cruel', 'Antigo',
  'Renegado', 'Brutal', 'Sanguinário', 'Atormentado', 'Sombrio',
  'Imortal', 'Abissal'
];

const BOSS_ROSTER = [
  { name: 'Grão-Inquisidor Valerius', icon: '⚜️', title: 'Flagelo da Aurora' },
  { name: 'Fenrir, O Devorador de Luas', icon: '🐺', title: 'Alfa Ancestral' },
  { name: 'Condessa Carmilla Bathory', icon: '👑', title: 'Soberana do Sangue' },
  { name: 'Abominação da Catedral', icon: '👹', title: 'Colosso de Carne' },
  { name: 'Malakor, O Lich Eterno', icon: '☠️', title: 'Senhor da Necrópole' }
];

const ITEM_TEMPLATES = {
  weapon: [
    { name: 'Adaga Enferrujada',   icon: '🗡️', primary: 'strength', secondary: 'agility' },
    { name: 'Espada Bastarda',     icon: '⚔️', primary: 'strength', secondary: 'vitality' },
    { name: 'Garras de Prata',     icon: '🪝', primary: 'agility',  secondary: 'strength' },
    { name: 'Foice Cerimonial',    icon: '🪓', primary: 'strength', secondary: 'agility' }
  ],
  armor: [
    { name: 'Gibão de Couro',      icon: '🧥', primary: 'defense',  secondary: 'agility' },
    { name: 'Cota de Malha Negra', icon: '🛡️', primary: 'defense',  secondary: 'vitality' },
    { name: 'Manto Aristocrático', icon: '🧛', primary: 'agility',  secondary: 'defense' },
    { name: 'Couraça Gótica',      icon: '🦺', primary: 'defense',  secondary: 'vitality' }
  ],
  relic: [
    { name: 'Anel de Rubi',        icon: '💍', primary: 'vitality', secondary: 'strength' },
    { name: 'Amuleto Lunar',       icon: '📿', primary: 'agility',  secondary: 'vitality' },
    { name: 'Cálice Profano',      icon: '🏆', primary: 'vitality', secondary: 'defense' },
    { name: 'Talismã de Obsidiana',icon: '🔮', primary: 'strength', secondary: 'defense' }
  ]
};

const RARITY_PREFIX = {
  common: 'Gasto', uncommon: 'Reforçado', rare: 'Sombrio', epic: 'Ancestral', legendary: 'Abissal'
};

export const Generators = {
  generateHuntTargets(playerLevel, playerFactionId) {
    const rival = GameConfig.factions[playerFactionId];
    const targets = [];
    const offsets = [-1, 0, Math.random() < 0.5 ? 1 : 2];

    offsets.forEach((offset, idx) => {
      const lvl = Math.max(1, playerLevel + offset);
      const isRival = idx === 2 && Math.random() < 0.6;
      const epithet = ENEMY_EPITHETS[Math.floor(Math.random() * ENEMY_EPITHETS.length)];

      let name, icon, tier;
      if (isRival) {
        name = `${rival.rivalName} ${epithet}`;
        icon = rival.rivalIcon;
        tier = 'Rival';
      } else {
        const arch = ENEMY_ARCHETYPES[Math.floor(Math.random() * ENEMY_ARCHETYPES.length)];
        name = `${arch.name} ${epithet}`;
        icon = arch.icon;
        tier = arch.tier;
      }

      const base = 4 + Math.floor(lvl * 2.4);
      const diffMult = offset > 0 ? 1.12 : (offset < 0 ? 0.88 : 1.0);
      const roll = () => Math.max(2, Math.floor((base + Math.floor(Math.random() * 3) - 1) * diffMult));

      targets.push({
        id: `enemy_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
        isBoss: false,
        name,
        icon,
        tier,
        level: lvl,
        difficultyLabel: offset < 0 ? 'Fácil' : (offset === 0 ? 'Equilibrado' : 'Perigoso'),
        stats: { strength: roll(), defense: roll(), agility: roll(), vitality: roll() }
      });
    });

    return targets;
  },

  // Gera o Chefe atual escalonado com os chefes já derrotados
  generateBoss(playerLevel, bossesDefeated = 0) {
    const template = BOSS_ROSTER[bossesDefeated % BOSS_ROSTER.length];
    const bossLevel = Math.max(3, playerLevel + 2 + Math.floor(bossesDefeated * 0.5));
    const statScale = Math.floor((6 + bossLevel * 3.1) * (1 + bossesDefeated * 0.08));

    return {
      id: `boss_${bossesDefeated}`,
      isBoss: true,
      name: template.name,
      title: template.title,
      icon: template.icon,
      tier: 'CHEFE',
      level: bossLevel,
      difficultyLabel: 'Mortal',
      stats: {
        strength: statScale,
        defense: Math.floor(statScale * 1.1),
        agility: Math.floor(statScale * 0.85),
        vitality: Math.floor(statScale * 1.45)
      }
    };
  },

  // Gera 3 missões procedurais ativas
  generateQuestSet(state) {
    const lvl = state.level || 1;
    const pool = [
      {
        type: 'wins',
        icon: '⚔️',
        title: 'Sede de Batalha',
        target: 5 + Math.floor(lvl * 1.5),
        progress: 0,
        descFn: (t) => `Vença ${t} combates na Caçada.`,
        rewardGold: 90 + lvl * 35,
        rewardXp: 70 + lvl * 25,
        rewardEssence: 0
      },
      {
        type: 'gold_earned',
        icon: '🪙',
        title: 'Tesouro das Sombras',
        target: 250 + lvl * 180,
        progress: 0,
        descFn: (t) => `Acumule ${SafeMath.formatNumber(t)} de Ouro.`,
        rewardGold: 120 + lvl * 45,
        rewardXp: 80 + lvl * 30,
        rewardEssence: 0
      },
      {
        type: 'stat_upgrades',
        icon: '💪',
        title: 'Ascensão Física',
        target: 4 + Math.floor(lvl * 0.8),
        progress: 0,
        descFn: (t) => `Evolua atributos ${t} vezes.`,
        rewardGold: 110 + lvl * 40,
        rewardXp: 95 + lvl * 32,
        rewardEssence: lvl >= 8 ? 1 : 0
      },
      {
        type: 'work_claims',
        icon: '⚰️',
        title: 'Vigia Implacável',
        target: 1 + Math.floor(lvl / 5),
        progress: 0,
        descFn: (t) => `Conclua e colete ${t} turno(s) de Trabalho.`,
        rewardGold: 140 + lvl * 50,
        rewardXp: 110 + lvl * 35,
        rewardEssence: lvl >= 6 ? 1 : 0
      }
    ];

    // Embaralha e seleciona 3
    const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, 3);
    return shuffled.map((q, idx) => ({
      uid: `quest_${Date.now()}_${idx}`,
      type: q.type,
      icon: q.icon,
      title: q.title,
      desc: q.descFn(q.target),
      target: q.target,
      progress: 0,
      claimed: false,
      rewardGold: q.rewardGold,
      rewardXp: q.rewardXp,
      rewardEssence: q.rewardEssence
    }));
  },

  rollRarity(bonusLuck = 0) {
    const entries = Object.values(GameConfig.rarities);
    const totalWeight = entries.reduce((acc, r) => acc + r.weight, 0);
    let roll = Math.random() * totalWeight * (1 - Math.min(0.4, bonusLuck));

    for (const r of entries) {
      if (roll <= r.weight) return r;
      roll -= r.weight;
    }
    return GameConfig.rarities.common;
  },

  generateEquipment(level, forcedRarity = null, dropBonus = 0) {
    const slots = ['weapon', 'armor', 'relic'];
    const slot = slots[Math.floor(Math.random() * slots.length)];
    const pool = ITEM_TEMPLATES[slot];
    const tpl = pool[Math.floor(Math.random() * pool.length)];
    const rarity = forcedRarity || this.rollRarity(dropBonus);

    const powerBudget = Math.max(2, Math.floor((2 + level * 1.4) * rarity.mult));
    const primaryVal = Math.max(1, Math.ceil(powerBudget * 0.65));
    const secondaryVal = Math.max(0, Math.floor(powerBudget * 0.35));

    const stats = { strength: 0, defense: 0, agility: 0, vitality: 0 };
    stats[tpl.primary] += primaryVal;
    stats[tpl.secondary] += secondaryVal;

    const price = Math.floor((25 + level * 18) * rarity.priceMult);

    return {
      uid: `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: 'equipment',
      slot,
      name: `${tpl.name} ${RARITY_PREFIX[rarity.id]}`,
      icon: tpl.icon,
      rarity: rarity.id,
      rarityName: rarity.name,
      stats,
      price,
      sellPrice: Math.max(5, Math.floor(price * 0.4))
    };
  },

  generateShopStock(playerLevel) {
    const stock = [];
    for (let i = 0; i < 4; i++) {
      stock.push(this.generateEquipment(playerLevel));
    }
    GameConfig.consumables.forEach(c => stock.push({ ...c }));
    return stock;
  }
};
