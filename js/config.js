/**
 * ============================================================================
 * CONFIG.JS — PARÂMETROS CENTRAIS DE BALANCEAMENTO (V3)
 * ============================================================================
 */
export const GameConfig = {
  storageKey: 'noctis_dominion_save_v3',
  legacyKeys: ['noctis_dominion_save_v2', 'noctis_dominion_save_v1'],
  saveVersion: 3,
  maxOfflineSeconds: 24 * 3600,

  // 1. CURVAS DE PROGRESSÃO (Ajuste fino de ritmo)
  curves: {
    xpBase: 100,
    xpExponent: 1.48,

    statCostBase: 14,
    statCostExponent: 1.38,

    workGoldBasePerHour: 45,
    workGoldPerLevel: 20,
    workXpBasePerHour: 28,
    workXpPerLevel: 14,

    passiveGoldPerSanctumLevel: 30,

    hpRegenPctPerMin: 0.08,
    energyBaseMax: 100,
    energyRegenPerMin: 2.0,
    huntEnergyCost: 15,
    bossEnergyCost: 35,
    bossCooldownSec: 600, // 10 minutos entre tentativas de Chefe
    autoHuntMaxRuns: 5
  },

  // 2. SISTEMA DE PRESTÍGIO ("Despertar Ancestral")
  prestige: {
    minLevelRequired: 10,        // Nível mínimo para despertar
    essenceDivisor: 4,           // Ganho base: floor(pow((level - 9), 1.35) / 2) + bônus
    startingGoldPerAwakening: 100,
    upgrades: {
      bloodPotency: {
        id: 'bloodPotency',
        name: 'Sangue Primordial',
        icon: '🩸',
        desc: '+15% de Dano e Vitalidade efetiva por nível.',
        baseCost: 1,
        costMult: 1.6,
        maxLevel: 25,
        bonusPerLevel: 0.15
      },
      darkAvarice: {
        id: 'darkAvarice',
        name: 'Avareza Sombria',
        icon: '👑',
        desc: '+20% de Ouro no Trabalho, Caçadas e Renda Passiva por nível.',
        baseCost: 1,
        costMult: 1.65,
        maxLevel: 25,
        bonusPerLevel: 0.20
      },
      eternalWisdom: {
        id: 'eternalWisdom',
        name: 'Sabedoria Eterna',
        icon: '📖',
        desc: '+18% de XP ganho em todas as fontes por nível.',
        baseCost: 2,
        costMult: 1.75,
        maxLevel: 20,
        bonusPerLevel: 0.18
      },
      shadowMastery: {
        id: 'shadowMastery',
        name: 'Maestria Arcana',
        icon: '🔮',
        desc: '-1 turno de Cooldown nas habilidades (mín. 2) e +10% chance de drop.',
        baseCost: 3,
        costMult: 2.2,
        maxLevel: 3,
        cdReductionPerLevel: 1,
        dropBonusPerLevel: 0.10
      }
    }
  },

  // 3. HABILIDADES DE COMBATE POR FACÇÃO
  skills: {
    vampire: [
      {
        id: 'crimson_bite',
        name: 'Mordida Carmesim',
        icon: '🧛',
        cooldown: 3,
        desc: 'Causa 150% de dano e drena 45% do dano causado como HP.'
      },
      {
        id: 'hemorrhage',
        name: 'Maldição Hemorrágica',
        icon: '🩸',
        cooldown: 4,
        desc: 'Aplica Sangramento por 3 turnos (35% da Força por turno).'
      }
    ],
    werewolf: [
      {
        id: 'lunar_frenzy',
        name: 'Frenesi Lunar',
        icon: '🌕',
        cooldown: 4,
        desc: 'Aumenta o próprio dano em +45% por 3 turnos.'
      },
      {
        id: 'rending_claws',
        name: 'Garras Dilacerantes',
        icon: '🐾',
        cooldown: 3,
        desc: 'Golpe brutal (165% dano) que aplica Sangramento por 2 turnos.'
      }
    ]
  },

  // 4. FACÇÕES
  factions: {
    vampire: {
      id: 'vampire',
      name: 'Vampiro',
      rivalName: 'Lobisomem',
      icon: '🩸',
      rivalIcon: '🐺',
      goldMult: 1.15,
      strMult: 1.0,
      defMult: 1.0,
      agiMult: 1.10,
      vitMult: 1.0,
      bonusDesc: '+15% Ouro Trabalho • +10% Agilidade'
    },
    werewolf: {
      id: 'werewolf',
      name: 'Lobisomem',
      rivalName: 'Vampiro',
      icon: '🐺',
      rivalIcon: '🩸',
      goldMult: 1.0,
      strMult: 1.10,
      defMult: 1.0,
      agiMult: 1.0,
      vitMult: 1.15,
      bonusDesc: '+10% Força • +15% Vitalidade'
    }
  },

  // 5. ESCONDERIJO
  hideoutBuildings: {
    crypt: {
      id: 'crypt',
      name: 'Cripta Ancestral',
      icon: '🏰',
      desc: 'Gera renda passiva de Ouro por hora mesmo offline.',
      baseCost: 120,
      costMult: 1.65,
      maxLevel: 30
    },
    altar: {
      id: 'altar',
      name: 'Altar das Sombras',
      icon: '🕯️',
      desc: 'Aumenta em +6% por nível o ganho de Ouro e XP no Trabalho.',
      baseCost: 150,
      costMult: 1.70,
      maxLevel: 25,
      bonusPerLevel: 0.06
    },
    bastion: {
      id: 'bastion',
      name: 'Muralha Gótica',
      icon: '🧱',
      desc: 'Concede +5% por nível de bônus na Defesa efetiva e regeneração de HP.',
      baseCost: 140,
      costMult: 1.68,
      maxLevel: 25,
      defBonusPerLevel: 0.05
    }
  },

  // 6. RARIDADES & CONSUMÍVEIS
  rarities: {
    common:    { id: 'common',    name: 'Comum',     mult: 1.0,  priceMult: 1.0,  weight: 50 },
    uncommon:  { id: 'uncommon',  name: 'Incomum',   mult: 1.35, priceMult: 1.8,  weight: 28 },
    rare:      { id: 'rare',      name: 'Raro',      mult: 1.8,  priceMult: 3.2,  weight: 14 },
    epic:      { id: 'epic',      name: 'Épico',     mult: 2.4,  priceMult: 5.5,  weight: 6 },
    legendary: { id: 'legendary', name: 'Lendário',  mult: 3.2,  priceMult: 9.0,  weight: 2 }
  },

  consumables: [
    {
      id: 'pot_hp_small',
      type: 'consumable',
      effect: 'heal_hp',
      amountPct: 0.50,
      name: 'Elixir Carmesim Menor',
      icon: '🧪',
      desc: 'Restaura 50% do HP máximo instantaneamente.',
      price: 45
    },
    {
      id: 'pot_hp_full',
      type: 'consumable',
      effect: 'heal_hp',
      amountPct: 1.0,
      name: 'Essência Vital Pura',
      icon: '🍷',
      desc: 'Restaura 100% do HP máximo instantaneamente.',
      price: 95
    },
    {
      id: 'pot_energy',
      type: 'consumable',
      effect: 'restore_energy',
      amountFlat: 50,
      name: 'Tônico da Lua Negra',
      icon: '⚡',
      desc: 'Restaura +50 de Energia para Caçadas.',
      price: 80
    }
  ]
};
