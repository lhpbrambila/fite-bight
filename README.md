# Noctis Dominion — Idle RPG Gótico (Fase 4)

RPG incremental gótico/sombrio **100% offline** (PWA + Service Worker) e **mobile-first**, com sistema de ícones SVG inline centralizados (`js/icons.js` + `css/icons.css`) preparado para substituição futura por ícones locais (ex.: Game-icons.net).

## Estrutura do Projeto

```text
├── index.html
├── manifest.json
├── sw.js
├── css/
│   ├── style.css
│   └── icons.css
├── js/
│   ├── icons.js        # Registro centralizado ICONS + renderizador SVG/local
│   ├── config.js       # Curvas, facções, fases da lua, runas, desafios e loja
│   ├── utils.js        # SafeMath e formatação numérica
│   ├── formulas.js     # Cálculos cruzados de atributos, combate e prestígio
│   ├── generators.js   # Geração de inimigos, chefes, equipamentos e missões
│   ├── systems.js      # Lua, forja, runas, clã e expedições offline
│   ├── abyss.js        # Masmorra infinita (O Abismo) e bestiário
│   ├── state.js        # Persistência localStorage + Export/Import Base64
│   ├── combat.js       # Motor de combate tático com logs estilizados
│   ├── tests.js        # Suíte de testes de integridade
│   ├── ui.js           # Renderização da interface mobile-first
│   └── main.js         # Loop principal idle e eventos
└── assets/
    └── icons/
        └── game-icons-local/   # Pasta pronta para SVGs/PNGs locais
```
