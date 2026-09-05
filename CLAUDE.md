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
├── assets/enemies/             # definiciones de enemigos por clase (ver skill enemy-definitions)
│   ├── enemigo_base.ts          # clase EnemyBase — de la que heredan todos
│   ├── slime.ts                  # un archivo por enemigo migrado (hp/defensa/ataque/vision/loot/oro)
│   └── index.ts                  # ENEMY_DEFINITIONS — registro central
├── assets/items/                # definiciones de items por clase (ver skill item-definitions)
│   ├── item_base.ts              # clase ItemBase — de la que heredan todos
│   ├── rusty_sword.ts             # un archivo por item (buff/valorMinimo/valorMaximo/crafteo/efectoUso/descripcion)
│   └── index.ts                  # ITEM_DEFINITIONS — registro central
├── assets/npc/                   # definiciones de NPCs comerciantes (ver skill npc-trading)
│   ├── npc_base.ts                # clase NpcBase — de la que heredan todos
│   ├── herrero.ts                  # un archivo por NPC (inventario de tradeo + dialogos)
│   └── index.ts                  # NPC_DEFINITIONS — registro central
├── state/
│   ├── Base.ts                 # StateBase<T> genérica: estado + binding a DOM por placeholders __key__
│   ├── Hub.ts                  # instancia `hub` (HP, hambre, nivel, stats) — expuesta en window.STATE
│   └── index.astro             # expone window.STATE y dispara el render inicial
├── components/                 # UI por feature: <Nombre>/index.astro (markup) — ver regla 3
│   ├── Hub, Inventory, Crafting, Minimap, Death, ConfirmDialog, BottomBar, Toast, MainMenu, PauseMenu
├── scripts/
│   ├── app.ts                  # entry point, instancia Game
│   ├── constants.ts             # TILE, COLORS, STORAGE_KEY, STORAGE_VERSION, SAVE_SLOT_COUNT, defaults
│   ├── storage.ts               # capa localStorage genérica (legado de plantilla)
│   ├── components/              # clases TS que gobiernan cada .astro (Hub.ts, Inventory.ts, MainMenu.ts, ...)
│   └── game/
│       ├── Game.ts               # motor: estado, turnos, overlays, menú, save/load por ranura
│       ├── SaveSlots.ts           # 5 ranuras de guardado en localStorage (ver docs/ARQUITECTURA.md §4)
│       ├── Renderer.ts, Input.ts
│       ├── entities/ (Entity, Player)
│       ├── world/ (Tile, Room, Dungeon)
│       ├── systems/ (TurnSystem, CombatSystem, SpawnSystem)
│       └── data/recipes.ts
└── styles/main.css             # único CSS, inline en build
android/                        # proyecto Gradle, WebView wrapper (MainActivity.java)
scripts/post-build.mjs          # inlinea <script src> tras `astro build`
scripts/build-apk.mjs           # copia HTML a android/app/.../assets + corre Gradle
__tests__/                      # vitest + jsdom, ver `vitest.config.ts`
```

## Skills del proyecto — invócalas ANTES de tocar su área

| Skill | Cuándo | Antes de tocar |
|---|---|---|
| `mazmorra-astro-android` | Build Astro→Android, pipeline de un solo HTML, convenciones de página única/componentes | `astro.config.mjs`, `scripts/`, `android/`, `src/pages/index.astro`, o al agregar un componente |
| `game-state` | El patrón `StateBase<T>` (`src/state/`) — estado global tipo Hub, binding a DOM | `src/state/*.ts`, componentes que leen `window.STATE` |
| `save-system` | Ranuras de guardado, menú principal (Nueva partida/Continuar), menú de pausa (Continuar/Salir), ciclo de vida de `Game.ts` | `SaveSlots.ts`, `Game.ts`, `MainMenu.ts`/`.astro`, `PauseMenu.ts`/`.astro` |
| `map-generation` | Generación procedural de mazmorras: salas, pasillos, puertas, tipos de sala | `Dungeon.ts`, `Room.ts`, `Tile.ts` — sobre todo antes de tocar `carveCorridor` |
| `enemy-spawning` | Población inicial de enemigos, tope máximo por piso, reaparición al matar uno | `SpawnSystem.ts`, `Dungeon.placeEnemies`, `TurnSystem.playerAttack` |
| `difficulty` | Selección de dificultad (Fácil/Normal/Difícil), su persistencia y fórmulas de balance que dependen de ella | `DIFFICULTY_SETTINGS` en `constants.ts`, `Game.difficulty`, el paso de dificultad en `MainMenu.ts` |
| `player-state` | HP/hambre/nivel del jugador, detección de muerte (combate o inanición), permadeath | `Player.ts`, `Entity.ts`, `TurnSystem.executeWorldEffects`/`executeEnemyTurns`, `Game.handleDeath` |
| `enemy-definitions` | Crear o actualizar un enemigo (stats, vision, loot, oro) en `src/assets/enemies/` | `enemigo_base.ts`, cualquier `<tipo>.ts` de enemigo, `index.ts` del registro, `TurnSystem.dropLoot` |
| `item-definitions` | Crear o actualizar un item (buff, valorMinimo/valorMaximo, crafteo, efecto de uso) en `src/assets/items/` | `item_base.ts`, cualquier `<tipo>.ts` de item, `index.ts` del registro, `game/data/recipes.ts`, `ItemSystem.ts` |
| `npc-trading` | Escaleras de subida/bajada entre pisos, el mercado (piso 0), NPCs comerciantes, precios dinámicos | `src/assets/npc/`, `Dungeon.generateMarket`/`stairsUpPos`/`stairsDownPos`, `Market.ts`, `TradeSystem.ts`, `MarketUI.ts`/`.astro`, `Game.goDownStairs`/`goUpStairs`/`openTrade` |

## Sistema de estado (`StateBase<T>`)

> **Nota conocida**: `src/components/Hub/index.astro` usa IDs compuestos (`hub-hp-text`, `hub-level-text`, …) y placeholders `__hub-hp__`, pero `StateBase.onUpdateData` busca un único elemento con `id === this.key` (`"hub"`) y reemplaza `__key__` (p. ej. `__hp__`, no `__hub-hp__`). Esto hace que varios tests en `src/__tests__/state/Hub.test.ts` fallen hoy (`bun run test`). Es trabajo en curso del propio usuario — no lo "arregles" de oficio; si te piden tocar esa zona, primero pregunta si quieren que la lógica de `onUpdateData` soporte IDs compuestos o si el HTML debe alinearse a la convención `{key}-{prop}` de `.opencode/skills/use-state` / `.claude/skills/game-state`.

## Sistemas del juego (resumen)

- **Render**: Canvas 2D, tiles de 32px, sprites 100% programáticos (`ctx.fillRect`).
- **Movimiento**: turnos discretos por clic/tap en celda adyacente (distancia Manhattan = 1), WASD/flechas, swipe táctil.
- **Combate**: `daño = max(1, ATK - DEF + varianza(-1,0,1))` (`CombatSystem.ts`).
- **Crafteo**: 4 estaciones (banco, horno, yunque, mesón). `RECIPES` (`game/data/recipes.ts`) se deriva de `crafteo`/`estacion` de cada item en `ITEM_DEFINITIONS` — no la edites a mano, ver skill `item-definitions`.
- **Generación de mazmorras**: salas + pasillos procedurales por piso (`Dungeon.ts`), mínimo `5 + Math.ceil(piso / 3)` salas (con reintento achicando tamaño si no entran), conectadas por recorrido de vecino más cercano de forma que cada sala termina con 2-3 puertas (mejor esfuerzo, ~93% medido) — ver skill `map-generation` antes de tocarla.
- **Enemigos**: se mueven libremente por toda la mazmorra (no solo su sala de origen — `CombatSystem.ts` no restringe por sala). Tope de enemigos vivos por piso: `6 + Math.ceil(piso / divisor)` (`SpawnSystem.getMaxEnemies`); al morir uno, reaparece otro en otra parte lejos del jugador (`trySpawnReplacementEnemy`, disparado desde `TurnSystem.playerAttack`). Ver skill `enemy-spawning`.
- **Definiciones de enemigos** (`src/assets/enemies/`): sistema por clases (`EnemyBase` + una subclase por tipo — `Slime`, `Rat`, `Skeleton`) con stats + `vision` (rango de detección, mapea a `aggroRange` en runtime) + `loot`/`oro` que suelta al morir. Es la única fuente de tipos de enemigo — `ENEMY_TYPES`/`EnemyDef` (el sistema plano viejo) se retiraron al completar la migración. Ver skill `enemy-definitions` antes de crear o modificar un enemigo.
- **Dificultad**: se elige una sola vez al crear la partida (Fácil/Normal/Difícil, `MainMenu.ts` → `Game.startNewGame(slot, difficulty)`), persiste en la ranura de guardado, y hoy controla el divisor del tope de enemigos. Ver skill `difficulty`.
- **Muerte y permadeath**: al llegar a 0 hp (combate o hambre en 0), `Game.handleDeath()` se dispara desde el único punto de chequeo al final de `TurnSystem.executePlayerAction` — antes NADIE lo llamaba (bug real, ya arreglado). Muestra la pantalla de muerte (sin botón "Continuar") y **borra la ranura de guardado** — permadeath, esa partida no se puede retomar. Ver skill `player-state`.
- **Regeneración de vida**: mientras el jugador esté alimentado (`hunger > 0`), regenera 1 hp cada 10 turnos (`HP_REGEN_INTERVAL_TURNS`/`HP_REGEN_AMOUNT` en `constants.ts`, lógica en `TurnSystem.executeWorldEffects`); no regenera con hambre en 0 (ahí resta vida en su lugar). Ver skill `player-state`.
- **Oro**: `player.gold` (persiste en la ranura de guardado, se muestra en el HUD junto a ataque/defensa). Entra por loot de enemigos (`src/assets/enemies/`) y se gasta comprándole a los NPCs del mercado. Ver skills `enemy-definitions`/`item-definitions`/`npc-trading`.
- **Definiciones de items** (`src/assets/items/`): sistema por clases (`ItemBase` + una subclase por tipo — armas/armaduras/herramientas/consumibles/materiales) con `buff` (ataque/defensa al equipar), `efectoUso` (vida/comida al consumir), `valorMinimo`/`valorMaximo` (banda de precio de venta — el precio real, dinámico, vive por NPC en `Market.ts`), `descripcion` y `crafteo`/`estacion` (materiales y estación requeridos, si es crafteable). Es la única fuente de items — `ITEM_TYPES`/`ItemDef` (el sistema plano viejo) se retiraron al completar la migración, y `RECIPES` ahora se deriva de acá en vez de estar hardcodeado por separado. Ver skill `item-definitions` antes de crear o modificar un item.
- **Escaleras y pisos**: cada piso tiene una escalera de entrada (`stairsUpPos`, sube) y una de salida (`stairsDownPos`, baja) — antes solo existía la de bajada y ni siquiera estaba conectada a nada (`Game.goDownStairs()` era código muerto). Subir o bajar a un piso ya visitado lo restaura EXACTAMENTE como quedó (enemigos con su vida actual, items ya recogidos) vía `Dungeon.goToFloor`/`floorCache` — solo genera uno nuevo la primera vez que se visita esa profundidad. Persiste en el guardado (`GameSaveData.floors`). Ver skill `npc-trading`.
- **Mercado** (piso 0, `Dungeon.generateMarket()`): se entra subiendo desde el piso 1, en vez de a un piso 0 procedural. Fijo (no regenera en cada visita) con los NPCs de `src/assets/npc/` (`NPC_DEFINITIONS`) parados ahí — caminar hacia uno abre el comercio (`Game.openTrade`) sin gastar turno. Cada NPC compra/vende su propia lista de items (`inventario`) a un precio dinámico (`Market.ts`, sube al comprar/baja al vender, clampeado a `[valorMinimo, valorMaximo]` del item) y tiene diálogos propios (saludo/compra/venta/sinDinero/despedida). Además, cada piso con `floor % 5 === 0` tiene una sala de comerciantes con los mismos NPCs directamente dentro de la mazmorra procedural (`room.type === 'merchant'`). Ver skill `npc-trading`.
- **Guardado**: 5 ranuras en localStorage (`SaveSlots.ts`), elegidas desde el menú principal Nueva partida/Continuar (`MainMenu.ts`); auto-guardado cada 30s + al cerrar sobre la ranura activa, versionado por `STORAGE_VERSION`. Ver skill `save-system`.
- **Menú de pausa** (botón ⏸️ en la barra inferior, `PauseMenu.ts`): Continuar / Salir (guarda y vuelve al menú principal). `Game.state` pasa a `'paused'` mientras está abierto — bloquea input igual que inventario/crafteo/mercado, Escape lo cierra.

Detalle completo del diseño y roadmap por fases: `INSTRUCCIONES.md`.

## Testing

`vitest` + `jsdom` (`vitest.config.ts`, incluye `src/**/*.test.{ts,js}`). Ejecuta `bun run test` antes de dar por cerrada cualquier tarea que toque `src/state/`, `src/scripts/game/` o `src/scripts/constants.ts`. Si añades un componente o sistema nuevo, añade su test en `src/__tests__/<misma-ruta-relativa>`.

## Al terminar una tarea

No hay auto-commit posible (ver arriba). Termina el turno indicando qué archivos cambiaron y qué falta probar; el usuario decide cuándo `git add`/`commit`/`push`.
