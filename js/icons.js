/**
 * ============================================================================
 * ICONS.JS — REGISTRO CENTRALIZADO DE ÍCONES (SVG INLINE & ARTE LOCAL)
 * ============================================================================
 * Para substituir qualquer ícone por um SVG/PNG local (ex.: Game-icons.net):
 *   chave: { type: 'img', src: './assets/icons/game-icons-local/nome.svg' }
 */
export const ICONS = {
  factions: {
    vampire: {
      type: 'svg',
      paths: '<path d="M12 3L6 10l6 11 6-11-6-7zm0 3.4l3.5 4.1L12 17.5l-3.5-7L12 6.4z"/>'
    },
    werewolf: {
      type: 'svg',
      paths: '<path d="M5 4l4 4h6l4-4 1 7-3 5-5 5-5-5-3-5 1-7zm4.5 7a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm5 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>'
    }
  },

  stats: {
    strength: {
      type: 'svg',
      paths: '<path d="M18.5 3.5l2 2-9.2 9.2 2.1 2.1-2.1 2.1-2.1-2.1-4.7 4.7-2-2 4.7-4.7-2.1-2.1 2.1-2.1 2.1 2.1 9.2-9.2z"/>'
    },
    defense: {
      type: 'svg',
      paths: '<path d="M12 2.5l8 3.6v6.4c0 5.4-3.4 9.5-8 11-4.6-1.5-8-5.6-8-11V6.1l8-3.6z"/>'
    },
    agility: {
      type: 'svg',
      paths: '<path d="M13.5 2L5 13h6l-1 9 9-11h-6l.5-9z"/>'
    },
    vitality: {
      type: 'svg',
      paths: '<path d="M12 21.2S4 16.1 1.6 11.2C-.2 7.5 2 3.2 6.2 2.7c2.3-.3 4.4.8 5.8 2.6 1.4-1.8 3.5-2.9 5.8-2.6 4.2.5 6.4 4.8 4.6 8.5C20 16.1 12 21.2 12 21.2z"/>'
    },
    energy: {
      type: 'svg',
      paths: '<path d="M13.5 2L5 13h6l-1 9 9-11h-6l.5-9z"/>'
    }
  },

  currency: {
    gold: {
      type: 'svg',
      paths: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.2" fill="#1a1a24"/>'
    },
    essence: {
      type: 'svg',
      paths: '<path d="M12 2l5.8 10L12 22 6.2 12 12 2zm0 4.3L8.8 12l3.2 5.7 3.2-5.7L12 6.3z"/>'
    },
    scrap: {
      type: 'svg',
      paths: '<path d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3h-4l-.3 2.9a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.4 7.4 0 0 0 1.7 1L11 21h4l.3-2.9a7.4 7.4 0 0 0 1.7-1l2.5 1 2-3.5L19.4 13zM12 15.2A3.2 3.2 0 1 1 12 8.8a3.2 3.2 0 0 1 0 6.4z"/>'
    },
    lunarShard: {
      type: 'svg',
      paths: '<path d="M12 2l4.5 7.5L12 22 7.5 9.5 12 2z"/>'
    }
  },

  nav: {
    character: {
      type: 'svg',
      paths: '<circle cx="12" cy="7.5" r="3.5"/><path d="M4.5 20.5c0-3.8 3.3-6.5 7.5-6.5s7.5 2.7 7.5 6.5h-15z"/>'
    },
    hunt: {
      type: 'svg',
      paths: '<path d="M18.5 3.5l2 2-6.8 6.8 2.1 2.1-1.4 1.4-2.1-2.1-5.8 5.8-2-2 5.8-5.8-2.1-2.1 1.4-1.4 2.1 2.1 6.8-6.8z"/>'
    },
    domain: {
      type: 'svg',
      paths: '<path d="M12 3l9 7.5V21h-6v-6H9v6H3V10.5L12 3z"/>'
    },
    prestige: {
      type: 'svg',
      paths: '<path d="M12 2l2.5 6.8L21 11l-6.5 2.2L12 20l-2.5-6.8L3 11l6.5-2.2L12 2z"/>'
    },
    market: {
      type: 'svg',
      paths: '<path d="M14.5 4l5.5 5.5-2.5 2.5-5.5-5.5L14.5 4zM4 17.5l8.8-8.8 2.5 2.5L6.5 20H4v-2.5z"/>'
    },
    settings: {
      type: 'svg',
      paths: '<path d="M4 20v-7h3v7H4zm6.5 0V4h3v16h-3zm6.5 0v-11h3v11h-3z"/>'
    }
  },

  subtabs: {
    abyss: {
      type: 'svg',
      paths: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="1.8"/>'
    },
    bestiary: {
      type: 'svg',
      paths: '<path d="M5 4h13a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2V6a2 2 0 0 1 1-2zm2 3v10h11V7H7z"/>'
    },
    quests: {
      type: 'svg',
      paths: '<path d="M6 3h12a2 2 0 0 1 2 2v15l-4-2-4 2-4-2-4 2V5a2 2 0 0 1 2-2zm2 5h8v2H8V8zm0 4h6v2H8v-2z"/>'
    },
    clan: {
      type: 'svg',
      paths: '<path d="M12 4C7.5 4 4 7 3 11c2.5-1 4.5-.5 6 1 1-1.5 2-2 3-2s2 .5 3 2c1.5-1.5 3.5-2 6-1-1-4-4.5-7-9-7z"/>'
    },
    challenges: {
      type: 'svg',
      paths: '<path d="M7 3h2v18H7V3zm8 0h2v18h-2V3zM4 7h16v2H4V7zm0 8h16v2H4v-2z"/>'
    },
    shop: {
      type: 'svg',
      paths: '<path d="M4 6h16l-1.5 11h-13L4 6zm5 13a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm7 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>'
    },
    inventory: {
      type: 'svg',
      paths: '<path d="M6 8h12l1.5 12h-15L6 8zm3-4h6v3H9V4z"/>'
    },
    backup: {
      type: 'svg',
      paths: '<path d="M5 3h12l2 2v16H5V3zm3 2v5h7V5H8zm0 8v6h8v-6H8z"/>'
    }
  },

  actions: {
    refresh: {
      type: 'svg',
      paths: '<path d="M17.6 6.4A8 8 0 1 0 19.8 14h-2.1a6 6 0 1 1-1.5-6.1L13.5 11H20V4.5l-2.4 1.9z"/>'
    },
    export: {
      type: 'svg',
      paths: '<path d="M12 3l5 5h-3v6h-4V8H7l5-5zm-7 13h14v5H5v-5z"/>'
    },
    import: {
      type: 'svg',
      paths: '<path d="M12 15l-5-5h3V4h4v6h3l-5 5zm-7 2h14v4H5v-4z"/>'
    },
    test: {
      type: 'svg',
      paths: '<path d="M9 3h6v2h-1v4.4l4.6 7.8A2 2 0 0 1 16.9 20H7.1a2 2 0 0 1-1.7-2.8L10 9.4V5H9V3z"/>'
    },
    trash: {
      type: 'svg',
      paths: '<path d="M9 3h6l1 2h4v2H4V5h4l1-2zm-3 6h12l-1 12H7L6 9z"/>'
    },
    salvage: {
      type: 'svg',
      paths: '<path d="M12 4l3 3h-2v4h-2V7H9l3-3zm7 9l-2 4h-2l1.2-2.4-2.5-1.4 1-1.7L19 13zm-14 0l2.7-.5 1 1.7-2.5 1.4L7 17H5l-2-4h2z"/>'
    },
    lock: {
      type: 'svg',
      paths: '<path d="M7 10V7a5 5 0 0 1 10 0v3h2v11H5V10h2zm2 0h6V7a3 3 0 0 0-6 0v3z"/>'
    },
    check: {
      type: 'svg',
      paths: '<path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>'
    }
  },

  combat: {
    boss: {
      type: 'svg',
      paths: '<path d="M3 18l2-11 5 4 2-6 2 6 5-4 2 11H3zm0 2h18v2H3v-2z"/>'
    },
    bleed: {
      type: 'svg',
      paths: '<path d="M12 2.5S5.5 10.6 5.5 15.3a6.5 6.5 0 0 0 13 0C18.5 10.6 12 2.5 12 2.5z"/>'
    },
    warning: {
      type: 'svg',
      paths: '<path d="M12 3L2 20h20L12 3zm0 5.5l1.2 6h-2.4l1.2-6zm0 9.5a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6z"/>'
    },
    mirror: {
      type: 'svg',
      paths: '<circle cx="12" cy="10" r="6.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 16.5V22M9 22h6"/>'
    },
    win: {
      type: 'svg',
      paths: '<path d="M6 4h12v5a6 6 0 0 1-5 5.9V18h3v2H8v-2h3v-3.1A6 6 0 0 1 6 9V4z"/>'
    },
    lose: {
      type: 'svg',
      paths: '<circle cx="12" cy="10" r="6.5"/><path d="M8 16.5h8v4.5H8v-4.5z" fill="#1a1a24"/>'
    },
    drop: {
      type: 'svg',
      paths: '<path d="M4 9h16v11H4V9zm8-5a3 3 0 0 1 3 3H9a3 3 0 0 1 3-3z"/>'
    },
    skill: {
      type: 'svg',
      paths: '<path d="M12 2l2.3 6.2L21 10.5l-6.7 2.3L12 19l-2.3-6.2L3 10.5l6.7-2.3L12 2z"/>'
    },
    target: {
      type: 'svg',
      paths: '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3"/>'
    }
  },

  items: {
    weapon: {
      type: 'svg',
      paths: '<path d="M18.5 3.5l2 2-9.2 9.2 2.1 2.1-2.1 2.1-2.1-2.1-4.7 4.7-2-2 4.7-4.7-2.1-2.1 2.1-2.1 2.1 2.1 9.2-9.2z"/>'
    },
    armor: {
      type: 'svg',
      paths: '<path d="M12 2.5l8 3.6v6.4c0 5.4-3.4 9.5-8 11-4.6-1.5-8-5.6-8-11V6.1l8-3.6z"/>'
    },
    relic: {
      type: 'svg',
      paths: '<path d="M12 2l5.8 10L12 22 6.2 12 12 2z"/>'
    },
    potionSmall: {
      type: 'svg',
      paths: '<path d="M10 3h4v3l3 4.5a6.5 6.5 0 1 1-10 0L10 6V3z"/>'
    },
    potionFull: {
      type: 'svg',
      paths: '<path d="M9 3h6v2h-1v2.2c2.5 1 4.5 3.5 4.5 6.8a6.5 6.5 0 0 1-13 0c0-3.3 2-5.8 4.5-6.8V5H9V3z"/>'
    },
    tonic: {
      type: 'svg',
      paths: '<path d="M13 2L6 13h5l-1 9 8-11h-5l0-9z"/>'
    }
  },

  domain: {
    crypt: {
      type: 'svg',
      paths: '<path d="M12 2l7 6v13h-5v-6h-4v6H5V8l7-6z"/>'
    },
    altar: {
      type: 'svg',
      paths: '<path d="M12 2c1.8 2.4 4 4.2 4 7.2a4 4 0 0 1-8 0c0-2 1-3.5 2-4.7-.1 1.3.4 2.1 1 2.4-.2-1.7.3-3.5 1-4.9zM6 16h12v5H6v-5z"/>'
    },
    bastion: {
      type: 'svg',
      paths: '<path d="M4 5h3v3h3V5h4v3h3V5h3v7l-2 2v7H6v-7l-2-2V5z"/>'
    },
    scout: {
      type: 'svg',
      paths: '<path d="M19 4l1 1-8.5 8.5 2 2-1.5 1.5-2-2L5 20l-1-1 6.5-6.5-2-2 1.5-1.5 2 2L19 4z"/>'
    },
    brute: {
      type: 'svg',
      paths: '<path d="M4 6h11v6H4V6zm6 6h3v9h-3v-9z"/>'
    },
    occultist: {
      type: 'svg',
      paths: '<path d="M12 3c1.5 2 3 3.5 3 5.8a3 3 0 0 1-6 0C9 6.5 10.5 5 12 3zM7 13h10l1.5 8h-13L7 13z"/>'
    },
    catacombs: {
      type: 'svg',
      paths: '<circle cx="12" cy="10" r="6"/><path d="M8.5 16h7v5h-7v-5z"/>'
    },
    forest: {
      type: 'svg',
      paths: '<path d="M12 2l5 8h-3l4 7H6l4-7H7l5-8zm-1 15h2v4h-2v-4z"/>'
    },
    rift: {
      type: 'svg',
      paths: '<path d="M12 2l4 7-3 5 4 8H7l4-8-3-5 4-7z"/>'
    },
    expedition: {
      type: 'svg',
      paths: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15.5 8.5l-2 5-5 2 2-5 5-2z"/>'
    }
  },

  moon: {
    new_moon: {
      type: 'svg',
      paths: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="2.5 2.5"/>'
    },
    waxing_moon: {
      type: 'svg',
      paths: '<path d="M12 3.5a8.5 8.5 0 0 1 0 17V3.5z"/>'
    },
    full_moon: {
      type: 'svg',
      paths: '<circle cx="12" cy="12" r="8.5"/><circle cx="9.5" cy="10" r="1.3" fill="#13131a"/><circle cx="14.5" cy="14" r="1.7" fill="#13131a"/>'
    },
    waning_moon: {
      type: 'svg',
      paths: '<path d="M12 3.5v17a8.5 8.5 0 0 1 0-17z"/>'
    },
    offline: {
      type: 'svg',
      paths: '<path d="M15 3.5a8.5 8.5 0 1 0 5.5 15A8.5 8.5 0 0 1 15 3.5z"/>'
    }
  },

  abyssSpecies: {
    abyss_wraith: {
      type: 'svg',
      paths: '<path d="M12 3a7 7 0 0 0-7 7v11l2.3-2 2.4 2L12 19l2.3 2 2.4-2L19 21V10a7 7 0 0 0-7-7zm-2.2 7.5a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6zm4.4 0a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6z"/>'
    },
    abyss_hound: {
      type: 'svg',
      paths: '<path d="M4 5l3 3h7l3-3 1 6-2 4-4 6-4-6-2-4 1-6z"/>'
    },
    abyss_golem: {
      type: 'svg',
      paths: '<path d="M7 3h10l3 5-2 13H6L4 8l3-5z"/>'
    },
    abyss_vampire: {
      type: 'svg',
      paths: '<path d="M12 3L6 10l6 11 6-11-6-7z"/>'
    },
    abyss_horror: {
      type: 'svg',
      paths: '<circle cx="12" cy="9" r="6"/><path d="M7 15l-2 6M10 15l-1 6M14 15l1 6M17 15l2 6"/>'
    },
    miniBoss: {
      type: 'svg',
      paths: '<path d="M4 6l4 3 4-5 4 5 4-3-1 11-7 4-7-4-1-11z"/>'
    }
  }
};

export function resolveIcon(keyPath) {
  if (!keyPath) return null;
  return keyPath.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : null), ICONS);
}

/**
 * Renderiza um ícone em HTML (inline SVG por padrão, ou <img> local se type === 'img').
 */
export function iconHTML(keyPath, opts = {}) {
  const def = resolveIcon(keyPath);
  const {
    size = 'md',
    tone = '',
    glow = false,
    active = false,
    disabled = false,
    label = '',
    className = ''
  } = opts;

  const classes = [
    'g-icon',
    `g-icon--${size}`,
    tone ? `g-icon--${tone}` : '',
    glow ? 'g-icon--glow' : '',
    active ? 'g-icon--active' : '',
    disabled ? 'g-icon--disabled' : '',
    className
  ].filter(Boolean).join(' ');

  const a11y = label
    ? `role="img" aria-label="${escapeAttr(label)}"`
    : 'aria-hidden="true"';

  if (!def) {
    return `<span class="${classes}" ${a11y}></span>`;
  }

  if (def.type === 'img') {
    return `<span class="${classes}" ${a11y}><img class="g-icon__img" src="${escapeAttr(def.src)}" alt="" loading="eager" decoding="async" /></span>`;
  }

  const viewBox = def.viewBox || '0 0 24 24';
  return `<span class="${classes}" ${a11y}><svg class="g-icon__svg" viewBox="${escapeAttr(viewBox)}" focusable="false">${def.paths}</svg></span>`;
}

/**
 * Hidrata elementos estáticos do HTML com data-icon="categoria.chave".
 */
export function hydrateStaticIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => {
    const keyPath = el.dataset.icon;
    const size = el.dataset.size || 'md';
    const tone = el.dataset.tone || '';
    const glow = el.dataset.glow === 'true';
    const label = el.dataset.label || '';
    el.innerHTML = iconHTML(keyPath, { size, tone, glow, label });
  });
}

function escapeAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
