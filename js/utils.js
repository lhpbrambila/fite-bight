/**
 * ============================================================================
 * UTILS.JS — SANITIZAÇÃO NUMÉRICA E NOTAÇÃO HÍBRIDA (SUFIXOS + CIENTÍFICA)
 * ============================================================================
 */
const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
const MAX_SAFE_FLOAT = 1e300;

export const SafeMath = {
  clamp(val, min = 0, max = MAX_SAFE_FLOAT) {
    const n = Number(val);
    if (!Number.isFinite(n) || Number.isNaN(n)) return min;
    return Math.min(max, Math.max(min, n));
  },

  int(val, min = 0, max = MAX_SAFE_FLOAT) {
    return Math.floor(this.clamp(val, min, max));
  },

  formatNumber(num) {
    const clean = this.clamp(num, -MAX_SAFE_FLOAT, MAX_SAFE_FLOAT);
    const abs = Math.abs(clean);
    if (abs < 10000) return Math.floor(clean).toLocaleString('pt-BR');

    const tier = Math.floor(Math.log10(abs) / 3);
    if (tier >= SUFFIXES.length) {
      return clean.toExponential(2).replace('+', '');
    }

    const scale = Math.pow(10, tier * 3);
    const scaled = clean / scale;
    return `${scaled.toFixed(2)}${SUFFIXES[tier]}`;
  }
};
