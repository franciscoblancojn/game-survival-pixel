# Mazmorra — Contexto para Claude Code

Roguelike de supervivencia top-down (estilo Pixel Dungeon), construido con **Astro + TypeScript** y empaquetado como **APK Android (WebView)**. Todo el estado se persiste en **localStorage**, sin backend.

Lee también `INSTRUCCIONES.md` (diseño/roadmap del juego) y `README.md` (comandos y estructura). Este archivo describe *cómo* trabajar en el repo con Claude Code.

## Reglas no negociables

1. **Todo en TypeScript** (`.ts` / `.astro` con `<script lang="ts">` implícito por `tsconfig` strict). No añadir `.js` nuevos: los `.js` mencionados en docs viejas son legado de la plantilla, el código real ya vive en `.ts`.
2. **Una sola página** — `src/pages/index.astro` es la única ruta. El "SPA" son overlays (inventario, crafteo, minimapa, muerte, confirmación) mostrados/ocultados sobre el mismo DOM, no rutas nuevas. No crear `src/pages/*.astro` adicionales sin que te lo pidan explícitamente.
3. **Sistema de componentes Astro + TS**: cada feature de UI es un componente `.astro` en `src/components/<Nombre>/index.astro` (markup + estilos scoped) que monta su lógica desde una clase TS homónima en `src/scripts/components/<Nombre>.ts`. No mezclar lógica de juego dentro del `.astro`; el `.astro` solo declara el markup y hace un `import` mínimo.
4. **Build final = un solo HTML autocontenido** (`astro.config.mjs` inlinea CSS, `scripts/post-build.mjs` inlinea JS). No introducir imágenes externas, fuentes remotas ni CDNs: los sprites son `ctx.fillRect()` programáticos.
5. **Persistencia = localStorage únicamente**, versionada (`STORAGE_KEY` / `STORAGE_VERSION` en `constants.ts`). Nunca añadir un backend, fetch a servidores propios, ni IndexedDB salvo que se pida.
6. **Git de escritura bloqueado para el agente** — ver siguiente sección. Compilar/testear libremente; el commit/push lo hace el humano.
7. **Sin frameworks de UI ni dependencias runtime nuevas** — vanilla TS + Canvas 2D + Astro. Antes de añadir una dependencia a `package.json`, confirma con el usuario.

## Git: qué puede y qué no puede hacer el agente

`.claude/settings.json` bloquea, vía `permissions.deny` + un hook `PreToolUse` sobre `Bash`, cualquier ejecución de:

```
git add · git commit · git merge · git push · git rebase · git reset --hard
```

tanto si se invocan directas como dentro de un comando compuesto (`cmd1 && git commit ...`). El bloqueo aplica a **cualquier agente que use este repo** (Claude Code, subagentes, workflows), no solo a la sesión interactiva.

- **Sí permitido**: `git status`, `git diff`, `git log`, `git show`, `git branch`, crear archivos, editar, `bun run build`, `bun run test`, etc.
- **No permitido**: staging, commits, merges, rebases o push. Si terminas un cambio, díselo al usuario y que lo confirme/commitee él manualmente — no lo intentes "por otra vía" (p. ej. `git commit-tree`, editar `.git/` a mano, o pedir al usuario que apruebe un permiso puntual para saltarte el hook).
- Si necesitas modificar esta política de git, es una decisión del usuario, no autónoma: pregúntale antes de tocar `.claude/settings.json`.

## Comandos

```bash
bun install           # Instalar dependencias (bun es obligatorio, npm está bloqueado por scripts/no-npm.sh)
bun run dev            # Servidor de desarrollo → http://localhost:4321
bun run build           # astro build + post-build.mjs → dist/index.html (un solo archivo)
bun run build:apk       # build + empaqueta APK Android → dist/mazmorra.apk
bun run preview         # Preview del build de producción
bun run test            # vitest run (jsdom)
bun run test:watch      # vitest en modo watch
```

Node >= 22.12.0 si se usa npm/node directo (no aplica si todo pasa por `bun`).

## Estructura relevante

```
src/
├── pages/index.astro          # única página — monta BaseLayout + todos los componentes
├── layouts/BaseLayout.astro   # shell HTML, meta mobile, importa main.css y src/state/index.astro
├── state/
│   ├── Base.ts                 # StateBase<T> genérica: estado + binding a DOM por placeholders __key__
│   ├── Hub.ts                  # instancia `hub` (HP, hambre, nivel, stats) — expuesta en window.STATE
│   └── index.astro             # expone window.STATE y dispara el render inicial
├── components/                 # UI por feature: <Nombre>/index.astro (markup) — ver regla 3
│   ├── Hub, Inventory, Crafting, Minimap, Death, ConfirmDialog, BottomBar, Toast
├── scripts/
│   ├── app.ts                  # entry point, instancia Game
│   ├── constants.ts             # TILE, COLORS, STORAGE_KEY, STORAGE_VERSION, defaults
│   ├── storage.ts               # capa localStorage genérica (legado de plantilla)
│   ├── components/              # clases TS que gobiernan cada .astro (Hub.ts, Inventory.ts, ...)
│   └── game/
│       ├── Game.ts               # motor: estado, turnos, overlays, save/load (localStorage directo)
│       ├── Renderer.ts, Input.ts
│       ├── entities/ (Entity, Player)
│       ├── world/ (Tile, Room, Dungeon)
│       ├── systems/ (TurnSystem, CombatSystem)
│       └── data/recipes.ts
└── styles/main.css             # único CSS, inline en build
android/                        # proyecto Gradle, WebView wrapper (MainActivity.java)
scripts/post-build.mjs          # inlinea <script src> tras `astro build`
scripts/build-apk.mjs           # copia HTML a android/app/.../assets + corre Gradle
__tests__/                      # vitest + jsdom, ver `vitest.config.ts`
```

## Sistema de estado (`StateBase<T>`)

Antes de tocar `src/state/*` o `src/components/*`, invoca la skill `game-state` (`.claude/skills/game-state/`) — documenta el patrón `StateBase<T>` (onGet/onSet/onUpdateData/onRender) y la convención de IDs en el DOM.

> **Nota conocida**: `src/components/Hub/index.astro` usa IDs compuestos (`hub-hp-text`, `hub-level-text`, …) y placeholders `__hub-hp__`, pero `StateBase.onUpdateData` busca un único elemento con `id === this.key` (`"hub"`) y reemplaza `__key__` (p. ej. `__hp__`, no `__hub-hp__`). Esto hace que varios tests en `src/__tests__/state/Hub.test.ts` fallen hoy (`bun run test`). Es trabajo en curso del propio usuario — no lo "arregles" de oficio; si te piden tocar esa zona, primero pregunta si quieren que la lógica de `onUpdateData` soporte IDs compuestos o si el HTML debe alinearse a la convención `{key}-{prop}` de `.opencode/skills/use-state` / `.claude/skills/game-state`.

## Sistemas del juego (resumen)

- **Render**: Canvas 2D, tiles de 32px, sprites 100% programáticos (`ctx.fillRect`).
- **Movimiento**: turnos discretos por clic/tap en celda adyacente (distancia Manhattan = 1), WASD/flechas, swipe táctil.
- **Combate**: `daño = max(1, ATK - DEF + varianza(-1,0,1))` (`CombatSystem.ts`).
- **Crafteo**: 4 estaciones (banco, horno, yunque, mesón) — recetas en `game/data/recipes.ts`.
- **Guardado**: automático (Game.ts) en localStorage, versionado por `STORAGE_VERSION`.

Detalle completo del diseño y roadmap por fases: `INSTRUCCIONES.md`.

## Testing

`vitest` + `jsdom` (`vitest.config.ts`, incluye `src/**/*.test.{ts,js}`). Ejecuta `bun run test` antes de dar por cerrada cualquier tarea que toque `src/state/`, `src/scripts/game/` o `src/scripts/constants.ts`. Si añades un componente o sistema nuevo, añade su test en `src/__tests__/<misma-ruta-relativa>`.

## Al terminar una tarea

No hay auto-commit posible (ver arriba). Termina el turno indicando qué archivos cambiaron y qué falta probar; el usuario decide cuándo `git add`/`commit`/`push`.
