import { Formulas } from './formulas.js';
import { AbyssEngine } from './abyss.js';
import { CombatEngine } from './combat.js';
import { WorldSystems } from './systems.js';
import { StateManager } from './state.js';
import { ICONS, resolveIcon } from './icons.js';

export const Diagnostics = {
  runAll() {
    const results = [];
    const assert = (label, condition) => results.push({ label, pass: Boolean(condition) });

    assert('Curva de XP crescente (Nvl 1 < Nvl 10)', Formulas.xpToNextLevel(1) < Formulas.xpToNextLevel(10));
    assert('Escalonamento de Abismo (Andar 10 é Mini-Chefe)', AbyssEngine.generateFloorEnemy(10).isMiniBoss === true);

    const mockState = StateManager.createDefaultState('Tester', 'vampire');
    const enemy = AbyssEngine.generateFloorEnemy(1);
    const battle = CombatEngine.simulateBattle(mockState, enemy);
    assert('Simulação de combate retorna logs válidos', Array.isArray(battle.logs) && battle.logs.length > 0);

    const iconCategories = Object.keys(ICONS);
    assert('Módulo centralizado ICONS carregado', iconCategories.length >= 8 && resolveIcon('stats.strength') !== null);

    const sword = { name: 'Lâmina', slot: 'weapon', rarity: 'rare', level: 2, price: 200, upgradeLevel: 0, stats: { strength: 10, defense: 0, agility: 4, vitality: 0 } };
    assert('Venda na loja retorna exatamente 50% do valor original', WorldSystems.getItemSellValue(sword) === 100);

    const betterSword = { name: 'Espada Ancestral', slot: 'weapon', rarity: 'epic', level: 4, price: 500, upgradeLevel: 0, stats: { strength: 16, defense: 2, agility: 4, vitality: 5 } };
    const cmp = WorldSystems.compareItemWithEquipped(betterSword, sword);
    assert('Comparação de equipamentos calcula deltas e saldo positivo corretamente', cmp.deltas.strength === 6 && cmp.deltas.agility === 0 && cmp.totalScoreDelta === 13);

    const cmpEmpty = WorldSystems.compareItemWithEquipped(sword, null);
    assert('Comparação contra slot vazio identifica ganho total', !cmpEmpty.hasEquipped && cmpEmpty.totalScoreDelta === 14);

    return results;
  }
};
