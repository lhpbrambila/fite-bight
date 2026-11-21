/**
 * ============================================================================
 * CONFIG.JS — PARÂMETROS CENTRAIS DE BALANCEAMENTO (FASE 4 / V4)
 * ============================================================================
 */
export const GameConfig = {
  storageKey: 'noctis_dominion_save_v4',
  legacyKeys: ['noctis_dominion_save_v3', 'noctis_dominion_save_v2', 'noctis_dominion_save_v1'],
  saveVersion: 4,
  maxOfflineSeconds: 24 * 3600,

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
    bossCooldownSec: 600,
    autoHuntMaxRuns: 5,

    // Forja & Recrutamento
    maxUpgradeLevel: 20,
    upgradeStatPerLevel: 0.08,
    upgradeBaseScrap: 10,
    upgradeScrapMult: 1.45,
    recruitBaseGold: 250,
    recruitGoldMult: 1.85,
    baseClanSlots: 4,
    maxSquadSize: 3
  },

  // 1. PRESTÍGIO & DESAFIOS (CHALLENGES)
  prestige: {
    minLevelRequired: 10,
    startingGoldPerAwakening: 100,
    upgrades: {
      bloodPotency: {
        id: 'bloodPotency', name: 'Sangue Primordial', iconKey: 'stats.vitality',
        desc: '+15% de Dano e Vitalidade efetiva por nível.',
        baseCost: 1, costMult: 1.6, maxLevel: 30, bonusPerLevel: 0.15
      },
      darkAvarice: {
        id: 'darkAvarice', name: 'Avareza Sombria', iconKey: 'currency.gold',
        desc: '+20% de Ouro em todas as fontes por nível.',
        baseCost: 1, costMult: 1.65, maxLevel: 30, bonusPerLevel: 0.20
      },
      eternalWisdom: {
        id: 'eternalWisdom', name: 'Sabedoria Eterna', iconKey: 'subtabs.bestiary',
        desc: '+18% de XP ganho por nível.',
        baseCost: 2, costMult: 1.75, maxLevel: 25, bonusPerLevel: 0.18
      },
      shadowMastery: {
        id: 'shadowMastery', name: 'Maestria Arcana', iconKey: 'combat.skill',
        desc: '-1 turno de Cooldown (mín. 2) e +10% chance de drop por nível.',
        baseCost: 3, costMult: 2.2, maxLevel: 3, cdReductionPerLevel: 1, dropBonusPerLevel: 0.10
      },
      clanExpansion: {
        id: 'clanExpansion', name: 'Domínio do Clã', iconKey: 'subtabs.clan',
        desc: '+1 vaga máxima de Seguidores no Clã por nível.',
        baseCost: 4, costMult: 2.5, maxLevel: 4, slotsPerLevel: 1
      }
    },
    challenges: {
      vow_of_poverty: {
        id: 'vow_of_poverty',
        name: 'Voto de Pobreza',
        iconKey: 'subtabs.challenges',
        goalDesc: 'Alcançar Nível 12 no ciclo',
        targetLevel: 12,
        targetAbyss: 0,
        restrictionDesc: 'Custos de ouro de atributos e esconderijo dobrados (2x).',
        rewardDesc: '+25% Ouro global permanente e -10% custo de Forja.'
      },
      bare_hands: {
        id: 'bare_hands',
        name: 'Mãos Nuas',
        iconKey: 'actions.lock',
        goalDesc: 'Alcançar Nível 12 no ciclo',
        targetLevel: 12,
        targetAbyss: 0,
        restrictionDesc: 'Slots de Arma e Relíquia bloqueados durante o ciclo.',
        rewardDesc: '+30% Força base permanente e +1 slot de Runa em itens Épicos.'
      },
      blood_thirst: {
        id: 'blood_thirst',
        name: 'Maldição da Sede',
        iconKey: 'combat.bleed',
        goalDesc: 'Vencer Andar 15 do Abismo',
        targetLevel: 10,
        targetAbyss: 15,
        restrictionDesc: 'Zero cura em combate (poções e drenagem desativadas).',
        rewardDesc: '+20% Vitalidade permanente e regeneração fora de combate dobrada.'
      },
      eternal_eclipse: {
        id: 'eternal_eclipse',
        name: 'Eclipse Eterno',
        iconKey: 'moon.new_moon',
        goalDesc: 'Vencer Andar 20 do Abismo',
        targetLevel: 12,
        targetAbyss: 20,
        restrictionDesc: 'Inimigos causam +35% dano e rendimento do Trabalho reduzido em 50%.',
        rewardDesc: '+1 vaga permanente de Seguidor e +15% Essências no Despertar.'
      }
    }
  },

  // 2. SEGUIDORES / CLÃ & EXPEDIÇÕES OFFLINE
  followerClasses: {
    scout:   { id: 'scout',   name: 'Batedor',   iconKey: 'domain.scout',     statFocus: 'agility',  bonusDesc: '+15% chance de Runas e -10% tempo de expedição' },
    brute:   { id: 'brute',   name: 'Bruto',     iconKey: 'domain.brute',     statFocus: 'strength', bonusDesc: '+25% Sucata Arcana e +15% Poder de Esquadrão' },
    occultist:{ id: 'occultist',name: 'Ocultista', iconKey: 'domain.occultist', statFocus: 'vitality', bonusDesc: '+25% Fragmentos Lunares e XP de expedição' }
  },

  expeditionRegions: [
    {
      id: 'catacombs',
      name: 'Catacumbas Esquecidas',
      iconKey: 'domain.catacombs',
      reqPower: 25,
      baseScrap: 18,
      baseShards: 4,
      runeChance: 0.25,
      desc: 'Rica em Sucata Arcana de antigos guerreiros.'
    },
    {
      id: 'moon_forest',
      name: 'Bosque da Lua Sangrenta',
      iconKey: 'domain.forest',
      reqPower: 65,
      baseScrap: 32,
      baseShards: 12,
      runeChance: 0.45,
      desc: 'Alta concentração de Fragmentos Lunares e Runas.'
    },
    {
      id: 'abyssal_rift',
      name: 'Fenda Abissal',
      iconKey: 'domain.rift',
      reqPower: 140,
      baseScrap: 65,
      baseShards: 28,
      runeChance: 0.75,
      desc: 'Região extrema com altíssima chance de Runas raras.'
    }
  ],

  // 3. RUNAS & ENCANTAMENTOS
  runeCatalog: [
    {
      id: 'rune_eclipse',
      name: 'Runa do Eclipse',
      iconKey: 'moon.new_moon',
      desc: 'Converte 15% da Defesa total em Força adicional.'
    },
    {
      id: 'rune_crimson',
      name: 'Runa Sanguínea',
      iconKey: 'combat.bleed',
      desc: 'Ao acertar Crítico, cura 8% do HP máx e reduz cooldown em 1 turno.'
    },
    {
      id: 'rune_pack',
      name: 'Runa da Matilha',
      iconKey: 'factions.werewolf',
      desc: '+3% de dano crítico por Seguidor recrutado no Clã.'
    },
    {
      id: 'rune_abyss',
      name: 'Runa do Abismo',
      iconKey: 'subtabs.abyss',
      desc: '+25% de dano contra Chefes e Mini-Chefes do Abismo.'
    }
  ],

  // 4. FASES DA LUA (CICLO DE 24H REAIS: 6H POR FASE)
  moonPhases: [
    {
      id: 'new_moon',
      name: 'Lua Nova',
      iconKey: 'moon.new_moon',
      desc: '+25% chance de drop de itens e Runas • -10% dano causado.',
      dropMult: 1.25,
      dmgMult: 0.90,
      xpMult: 1.0,
      forgeCostMult: 1.0
    },
    {
      id: 'waxing_moon',
      name: 'Lua Crescente',
      iconKey: 'moon.waxing_moon',
      desc: '+25% ganho de XP em todas as fontes.',
      dropMult: 1.0,
      dmgMult: 1.0,
      xpMult: 1.25,
      forgeCostMult: 1.0
    },
    {
      id: 'full_moon',
      name: 'Lua Cheia',
      iconKey: 'moon.full_moon',
      desc: '+30% Dano para Lobisomens • +30% Dreno e Sangramento para Vampiros.',
      dropMult: 1.0,
      dmgMult: 1.30,
      xpMult: 1.0,
      forgeCostMult: 1.0
    },
    {
      id: 'waning_moon',
      name: 'Lua Minguante',
      iconKey: 'moon.waning_moon',
      desc: '-20% custo de materiais na Forja e ouro no Esconderijo.',
      dropMult: 1.0,
      dmgMult: 1.0,
      xpMult: 1.0,
      forgeCostMult: 0.80
    }
  ],

  // 5. CONQUISTAS ESCALONADAS
  achievements: [
    { id: 'kills', name: 'Ceifador da Noite', statKey: 'totalKills', tiers: [50, 250, 1000, 5000], iconKey: 'nav.hunt' },
    { id: 'gold',  name: 'Magnata Sombrio',   statKey: 'totalGoldEarned', tiers: [5000, 100000, 2500000, 50000000], iconKey: 'currency.gold' },
    { id: 'abyss', name: 'Andarilho do Abismo',statKey: 'maxAbyssFloor', tiers: [10, 25, 50, 100], iconKey: 'subtabs.abyss' },
    { id: 'exped', name: 'Mestre de Expedições',statKey: 'expeditionsCompleted', tiers: [3, 15, 50, 150], iconKey: 'domain.expedition' }
  ],

  // 6. HABILIDADES, FACÇÕES, ESCONDERIJO & RARIDADES
  skills: {
    vampire: [
      { id: 'crimson_bite', name: 'Mordida Carmesim', iconKey: 'factions.vampire', cooldown: 3, desc: 'Causa 150% de dano e drena 45% do dano causado como HP.' },
      { id: 'hemorrhage', name: 'Maldição Hemorrágica', iconKey: 'combat.bleed', cooldown: 4, desc: 'Aplica Sangramento por 3 turnos (45% da Força por turno).' }
    ],
    werewolf: [
      { id: 'lunar_frenzy', name: 'Frenesi Lunar', iconKey: 'moon.full_moon', cooldown: 4, desc: 'Aumenta o próprio dano em +45% por 3 turnos.' },
      { id: 'rending_claws', name: 'Garras Dilacerantes', iconKey: 'actions.salvage', cooldown: 3, desc: 'Golpe brutal (165% dano) que aplica Sangramento por 2 turnos.' }
    ]
  },

  factions: {
    vampire: {
      id: 'vampire', name: 'Vampiro', rivalName: 'Lobisomem', iconKey: 'factions.vampire', rivalIconKey: 'factions.werewolf',
      goldMult: 1.15, strMult: 1.0, defMult: 1.0, agiMult: 1.10, vitMult: 1.0,
      bonusDesc: '+15% Ouro Trabalho • +10% Agilidade'
    },
    werewolf: {
      id: 'werewolf', name: 'Lobisomem', rivalName: 'Vampiro', iconKey: 'factions.werewolf', rivalIconKey: 'factions.vampire',
      goldMult: 1.0, strMult: 1.10, defMult: 1.0, agiMult: 1.0, vitMult: 1.15,
      bonusDesc: '+10% Força • +15% Vitalidade'
    }
  },

  hideoutBuildings: {
    crypt:   { id: 'crypt',   name: 'Cripta Ancestral',   iconKey: 'domain.crypt',   desc: 'Gera renda passiva de Ouro por hora mesmo offline.', baseCost: 120, costMult: 1.65, maxLevel: 40 },
    altar:   { id: 'altar',   name: 'Altar das Sombras',  iconKey: 'domain.altar',   desc: 'Aumenta em +6% por nível Ouro e XP no Trabalho.', baseCost: 150, costMult: 1.70, maxLevel: 35, bonusPerLevel: 0.06 },
    bastion: { id: 'bastion', name: 'Muralha Gótica',     iconKey: 'domain.bastion', desc: '+5% por nível na Defesa efetiva e regeneração de HP.', baseCost: 140, costMult: 1.68, maxLevel: 35, defBonusPerLevel: 0.05 }
  },

  rarities: {
    common:    { id: 'common',    name: 'Comum',     mult: 1.0,  priceMult: 1.0,  weight: 50, runeSlots: 0, scrapYield: 4 },
    uncommon:  { id: 'uncommon',  name: 'Incomum',   mult: 1.35, priceMult: 1.8,  weight: 28, runeSlots: 0, scrapYield: 9 },
    rare:      { id: 'rare',      name: 'Raro',      mult: 1.8,  priceMult: 3.2,  weight: 14, runeSlots: 1, scrapYield: 20 },
    epic:      { id: 'epic',      name: 'Épico',     mult: 2.4,  priceMult: 5.5,  weight: 6,  runeSlots: 2, scrapYield: 45 },
    legendary: { id: 'legendary', name: 'Lendário',  mult: 3.2,  priceMult: 9.0,  weight: 2,  runeSlots: 3, scrapYield: 100 }
  },

  consumables: [
    { id: 'pot_hp_small', type: 'consumable', effect: 'heal_hp', amountPct: 0.50, name: 'Elixir Carmesim Menor', iconKey: 'items.potionSmall', desc: 'Restaura 50% do HP máximo.', price: 45 },
    { id: 'pot_hp_full',  type: 'consumable', effect: 'heal_hp', amountPct: 1.0,  name: 'Essência Vital Pura',   iconKey: 'items.potionFull',  desc: 'Restaura 100% do HP máximo.', price: 95 },
    { id: 'pot_energy',   type: 'consumable', effect: 'restore_energy', amountFlat: 50, name: 'Tônico da Lua Negra', iconKey: 'items.tonic', desc: 'Restaura +50 de Energia.', price: 80 }
  ]
};
