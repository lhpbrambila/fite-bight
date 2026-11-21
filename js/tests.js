/**
 * ============================================================================
 * TESTS.JS — SUÍTE DE DIAGNÓSTICO E VALIDAÇÃO DE INTEGRIDADE V4
 * ============================================================================
 */
import { Formulas } from './formulas.js';
import { AbyssEngine } from './abyss.js';
import { CombatEngine } from './combat.js';
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

    return results;
  }
};
