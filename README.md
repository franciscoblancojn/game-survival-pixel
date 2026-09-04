# Mazmorra

Roguelike de supervivencia en vista superior (top-down), estilo pixel art tipo *Pixel Dungeon*. Construido con **Astro + TypeScript**, empaquetado como **una sola página web** que compila también a **APK Android** (WebView). Sin backend: todo el progreso se guarda en `localStorage`.

## Comandos

```bash
bun install           # Instalar dependencias
bun run dev            # Servidor de desarrollo (http://localhost:4321)
bun run build           # Build estático → dist/index.html (un solo archivo autocontenido)
bun run build:apk       # Build + empaquetado Android → dist/mazmorra.apk
bun run preview         # Preview del build de producción
bun run test             # Tests (vitest)
bun run test:watch       # Tests en modo watch
```

> **Package manager**: siempre `bun`. `npm install` está bloqueado intencionalmente (`scripts/no-npm.sh`).
> **Node.js**: si necesitas usar `node`/`npm` directamente, se requiere >= 22.12.0.

## Stack

- **Astro** (SSG) + **TypeScript** estricto — sin frameworks de UI.
- **Una sola página** (`src/pages/index.astro`): las pantallas (inventario, crafteo, minimapa, muerte, confirmaciones) son overlays sobre el mismo DOM, no rutas nuevas.
- **Sistema de componentes**: cada feature de UI es un par `src/components/<Nombre>/index.astro` (markup) + `src/scripts/components/<Nombre>.ts` (lógica).
- **Estado**: clase genérica `StateBase<T>` (`src/state/Base.ts`) con binding a DOM, expuesta globalmente en `window.STATE`.
- **Motor de juego**: TS puro en `src/scripts/game/` (Canvas 2D, sprites programáticos con `ctx.fillRect`, turnos discretos).
- **Persistencia**: `localStorage`, versionada (`STORAGE_KEY` / `STORAGE_VERSION`).
- **Build**: Astro SSG → `scripts/post-build.mjs` inlinea todo el JS → un solo `index.html` autocontenido (CSS ya inline vía `astro.config.mjs`).
- **Android**: wrapper WebView (`android/`), `scripts/build-apk.mjs` genera el APK con Gradle.

## Estructura

```
src/
├── pages/index.astro              # única página del juego
├── layouts/BaseLayout.astro       # shell HTML mobile-first
├── state/                         # estado global (StateBase<T>) — ver docs/ARQUITECTURA.md
├── components/                    # UI por feature (Hub, Inventory, Crafting, Minimap, Death, ...)
├── scripts/
│   ├── app.ts                      # entry point → instancia Game
│   ├── constants.ts                 # TILE, COLORS, STORAGE_KEY, defaults
│   ├── components/                  # clases TS de cada componente
│   └── game/
│       ├── Game.ts                   # motor: estado, turnos, overlays, save/load
│       ├── Renderer.ts, Input.ts
│       ├── entities/ (Entity, Player)
│       ├── world/ (Tile, Room, Dungeon)
│       ├── systems/ (TurnSystem, CombatSystem)
│       └── data/recipes.ts
└── styles/main.css                # único CSS del proyecto (pixel art, tema oscuro)
android/                           # proyecto Android (Gradle + WebView)
scripts/                           # post-build.mjs, build-apk.mjs
```

Detalle de arquitectura, sistema de estado y convenciones: [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md).
Diseño y roadmap del juego (fases, recetas, tipos de sala, etc.): [`INSTRUCCIONES.md`](INSTRUCCIONES.md).

## Sistemas del juego (resumen)

| Sistema | Detalle |
|---|---|
| Tiles | `VOID`, `FLOOR`, `WALL`, `DOOR`, `CORRIDOR`, `STAIRS_DOWN/UP` |
| Movimiento | Turnos discretos, clic/tap en celda adyacente, WASD/flechas, swipe |
| Combate | `daño = max(1, ATK - DEF + varianza(-1,0,+1))` |
| Crafteo | 4 estaciones: banco de trabajo 🪵, horno 🔥, yunque 🔨, mesón 🧪 |
| Guardado | Automático cada 30s + al cerrar, en `localStorage` |

## Trabajar con Claude Code / agentes de IA

Este repo incluye configuración de Claude Code en `.claude/` (`CLAUDE.md`, `settings.json`, `skills/`):

- **Los agentes no pueden hacer `git add`, `commit`, `merge`, `push` ni `rebase`** en este repositorio — bloqueado por permisos y un hook `PreToolUse` en `.claude/settings.json`. El staging/commit/push siempre lo hace una persona, manualmente.
- Convenciones de arquitectura (una página, sistema de componentes, TypeScript, `localStorage`) están descritas en `CLAUDE.md` y en las skills de `.claude/skills/`.

## Licencia

MIT

## Desarrollador

- **Nombre:** Francisco Blanco
- **Web:** https://franciscoblanco.vercel.app/
