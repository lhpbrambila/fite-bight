/**
 * ============================================================================
 * UTILS.JS — SANITIZAÇÃO NUMÉRICA E FORMATAÇÃO DE ESCALA LONGA
 * ============================================================================
 */
const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

export const SafeMath = {
  // Garante número finito dentro de limites seguros (previne NaN, Infinity e negativos)
  clamp(val, min = 0, max = Number.MAX_SAFE_INTEGER) {
    const n = Number(val);
    if (!Number.isFinite(n) || Number.isNaN(n)) return min;
    return Math.min(max, Math.max(min, n));
  },

  int(val, min = 0, max = Number.MAX_SAFE_INTEGER) {
    return Math.floor(this.clamp(val, min, max));
  },

  // Formata números grandes de forma legível em telas mobile (ex: 12.45K, 3.80M)
  formatNumber(num) {
    const clean = this.clamp(num, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
    const abs = Math.abs(clean);
    if (abs < 10000) return Math.floor(clean).toLocaleString('pt-BR');

    const tier = Math.min(SUFFIXES.length - 1, Math.floor(Math.log10(abs) / 3));
    const scale = Math.pow(10, tier * 3);
    const scaled = clean / scale;
    return `${scaled.toFixed(2)}${SUFFIXES[tier]}`;
  }
};
