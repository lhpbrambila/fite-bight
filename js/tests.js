/**
 * ============================================================================
 * TESTS.JS — VALIDAÇÃO AUTOMATIZADA DE FÓRMULAS, COMBATE E CÁLCULO OFFLINE
 * ============================================================================
 */
import { Formulas } from './formulas.js';
import { CombatEngine } from './combat.js';
import { createDefaultState, StateManager } from './state.js';

export const SelfTests = {
  runAll() {
    const results = [];
    const assert = (name, condition) => {
      results.push({ name, passed: Boolean(condition) });
    };

    // Teste 1: Curvas de custo e XP crescentes e sem NaN
    const xp1 = Formulas.xpToNextLevel(1);
    const xp10 = Formulas.xpToNextLevel(10);
    assert('Curva de XP positiva e crescente', xp1 > 0 && xp10 > xp1 && Number.isFinite(xp10));

    // Teste 2: Bônus de Prestígio amplificam atributos e ouro
    const sBase = createDefaultState();
    const sPrest = createDefaultState();
    sPrest.prestige.upgrades.bloodPotency = 2; // +30%
    sPrest.prestige.upgrades.darkAvarice = 2;  // +40%
    assert(
      'Multiplicadores de Prestígio aplicados',
      Formulas.getEffectiveStats(sPrest).strength > Formulas.getEffectiveStats(sBase).strength &&
      Formulas.getWorkHourlyRates(sPrest).goldPerHour > Formulas.getWorkHourlyRates(sBase).goldPerHour
    );

    // Teste 3: Simulação de combate nunca retorna HP negativo ou NaN
    const dummyEnemy = {
      name: 'Teste Alvo',
      level: 1,
      isBoss: false,
      difficultyLabel: 'Equilibrado',
      stats: { strength: 4, defense: 4, agility: 4, vitality: 4 }
    };
    const battle = CombatEngine.simulateBattle(sBase, dummyEnemy);
    assert(
      'Combate resolve com HP >= 1 e logs válidos',
      battle.remainingHp >= 1 && Array.isArray(battle.logs) && battle.logs.length > 0
    );

    // Teste 4: Proteção contra retrocesso de relógio offline
    const backupState = JSON.stringify(StateManager.state);
    const tampered = createDefaultState();
    tampered.lastTimestamp = Date.now() + 60000; // 1 min no futuro
    StateManager.state = tampered;
    const offlineCheck = StateManager.processOfflineProgress(() => ({ gold: 0, xp: 0 }));
    StateManager.state = JSON.parse(backupState);

    assert('Proteção contra retrocesso do relógio ativa', offlineCheck && offlineCheck.clockTampered === true);

    return results;
  }
};
