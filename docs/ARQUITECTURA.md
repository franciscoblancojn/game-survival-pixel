# Arquitectura

Este documento complementa el `README.md` (comandos/estructura) y `INSTRUCCIONES.md` (diseño del juego por fases). Aquí se explica *cómo* encajan las piezas técnicas: página única, sistema de componentes, estado global y el pipeline de build a Android.

## 1. Una sola página

`src/pages/index.astro` es la única ruta de la app. No hay enrutamiento del lado del cliente ni múltiples `.astro` en `src/pages/`. Lo que en una SPA tradicional serían "pantallas" aquí son **overlays**: divs que se muestran/ocultan con clases CSS sobre el mismo `#game-container`, montados todos de una vez en el layout:

```astro
<BaseLayout title="Mazmorra">
  <div id="game-container">
    <canvas id="game-canvas"></canvas>
    <Hub/>
    <Inventory/>
    <Crafting/>
    <Minimap/>
    <Death/>
    <ConfirmDialog/>
    <BottomBar/>
  </div>
  <Toast/>
  <script type="module">import '../scripts/app.ts';</script>
</BaseLayout>
```

`BaseLayout.astro` importa `main.css` (único CSS del proyecto) y `src/state/index.astro` (estado global, ver §3).

## 2. Sistema de componentes

Cada feature de UI sigue el mismo patrón de dos archivos:

| Archivo | Responsabilidad |
|---|---|
| `src/components/<Nombre>/index.astro` | Markup + estilos scoped del overlay/widget. Puede tener un `<script>` inline pequeño para enlazar al DOM (ver `Hub/index.astro`, que dispara `window.STATE?.hub.onRender()`). |
| `src/scripts/components/<Nombre>.ts` | Clase TS que gobierna el comportamiento: mostrar/ocultar, eventos de click, lectura/escritura de estado. |

El **motor de juego** (`src/scripts/game/`) es completamente independiente de Astro — son clases TS puras (`Game`, `Renderer`, `Input`, entidades, sistemas, mundo) que manipulan un `<canvas>` con la API 2D. `Game.ts` es el punto de integración: se instancia desde `app.ts` y se expone como `window.gameInstance` para que los botones de `BottomBar` (definidos inline en `index.astro`) puedan invocarlo.

### Añadir un componente nuevo

1. `src/components/<Nombre>/index.astro`.
2. `src/scripts/components/<Nombre>.ts`.
3. Registrar el `.astro` en `src/pages/index.astro`.
4. Si necesita datos vivos del juego, leerlos de `window.STATE` (estado) o de `window.gameInstance` (motor) — no dupliques estado en el componente.
5. Estilos en `src/styles/main.css` (namespacing por prefijo de clase, p. ej. `hud-*`, `inv-*`).

## 3. Estado global — `StateBase<T>`

`src/state/Base.ts` define una clase genérica que junta datos + binding a DOM:

```typescript
class StateBase<T> {
  onGet(key)          // lee del estado en memoria
  onSet(key, value)    // escribe en memoria (no toca el DOM)
  onUpdateData(key)     // sincroniza el DOM para esa key
  onRenderData(key, v)   // formatea el valor a string (override-able)
  onRender()              // onUpdateData para todas las keys
}
```

`src/state/Hub.ts` es la instancia concreta para los stats del jugador (HP, hambre, nivel, ataque, defensa, xp, piso). `src/state/index.astro` la expone en `window.STATE = { hub }` y dispara el render inicial cuando el DOM está listo.

**Detalle de implementación y una discrepancia conocida entre el binding de `Base.ts` y el HTML actual de `Hub/index.astro`** están documentados en la skill `.claude/skills/game-state/SKILL.md` — léela antes de tocar esta zona; no es un bug que deba "arreglarse de oficio" sin antes acordar con quien esté desarrollando esta parte cuál convención de IDs se usará.

## 4. Persistencia — `localStorage` con 5 ranuras

No hay backend. Tres piezas conviven hoy:

- `src/scripts/storage.ts` — capa genérica heredada de la plantilla base (`loadData`/`saveData`/`resetData`), con su propio `StorageData` (tema, username). No está integrada con el guardado de partida real.
- `src/scripts/game/SaveSlots.ts` — dueño de las claves de `localStorage` para las partidas: `SAVE_SLOT_COUNT` (5) ranuras, cada una en `mazmorra_save_slot_{n}`. Expone `listSlots`, `loadSlot`, `saveSlot`, `deleteSlot`, `firstFreeSlot` y `migrateLegacySave` (mueve la key vieja de antes de que existieran ranuras — `mazmorra_save` a secas — a la primera ranura libre, una sola vez).
- `src/scripts/game/Game.ts` — guardado real del progreso (jugador, mazmorra, stats) contra la ranura activa (`game.currentSlot`), vía `SaveSlots`. Auto-guardado cada 30s y al cerrar mientras hay una partida activa; no auto-carga nada al abrir la página — eso lo decide el jugador en el menú principal.

**Menú principal** (`src/components/MainMenu/` + `src/scripts/components/MainMenu.ts`): pantalla inicial con "Nueva partida" / "Continuar". Al iniciar, `Game.init()` muestra este menú (`state = 'menu'`) y **no** construye el motor de juego (`Renderer`/`Input`/etc. — ver `Game.ensureEngine()`) hasta que el jugador elige una ranura; así cada partida nueva genera una mazmorra distinta en vez de recargar siempre la misma. Click en una ranura vacía (modo "Nueva") arranca ahí directo; click en una ranura ocupada pide confirmación (reutiliza `showConfirm` de `ConfirmDialog.ts`) antes de borrarla y empezar de cero — así es como se resuelve el caso de las 5 ranuras llenas.

**Menú de pausa** (`src/components/PauseMenu/` + `src/scripts/components/PauseMenu.ts`): botón ⏸️ en la barra inferior, visible durante la partida. Abre un overlay con "Continuar" / "Salir" — Salir llama `saveGame()` y vuelve al menú principal (`exitToMenu()`), sin perder progreso. Mientras está abierto, `Game.state = 'paused'` bloquea el input igual que inventario/crafteo.

Detalle completo del ciclo de vida de `Game.ts` y de estas dos pantallas: skill `.claude/skills/save-system/SKILL.md`. Generación de mazmorras (salas/pasillos/puertas): skill `.claude/skills/map-generation/SKILL.md`.

Si se necesita persistir un dato nuevo, decidir explícitamente en cuál de las tres piezas vive antes de escribir código — no crear una cuarta.

## 5. Build → un solo HTML → APK Android

```
astro build          # genera dist/ ; astro.config.mjs fuerza CSS inline (inlineStylesheets, cssCodeSplit: false)
  ↓
post-build.mjs        # busca <script src="..."> en dist/index.html, inyecta el contenido, borra el archivo externo
  ↓
build-apk.mjs          # copia dist/index.html a android/app/src/main/assets/, genera iconos, corre Gradle
```

El resultado de `bun run build` es **un único `dist/index.html`** con CSS y JS embebidos — sin peticiones de red a assets propios. Esto es lo que permite que el WebView de Android (`MainActivity.java`) lo cargue como `file:///android_asset/...` sin conexión.

No introducir: imágenes externas, fuentes remotas (Google Fonts, CDNs), `fetch` a servicios propios, ni dependencias de UI que generen múltiples archivos de salida — todo rompe el modelo de "un solo HTML".

## 6. TypeScript

`tsconfig.json` extiende `astro/tsconfigs/strict`. Todo el código nuevo va en `.ts` (o `<script>` dentro de `.astro`, tipado por el mismo `tsconfig`). Los `.js` que aparecen en documentación antigua (`README` original de la plantilla, `INSTRUCCIONES.md`) son legado de cuando el proyecto no usaba TypeScript — el código real ya vive en `.ts`; no crear archivos `.js` nuevos.

## 7. Enemigos: población, tope y dificultad

`src/scripts/game/systems/SpawnSystem.ts` centraliza la creación de enemigos (`createEnemyInstance`) y el tope de enemigos vivos por piso (`getMaxEnemies(floor, difficulty) = 6 + Math.ceil(floor / divisor)`). Se usa en dos momentos:

- **Población inicial** de un piso recién generado — `Dungeon.placeEnemies(floor, difficulty)`, llamado desde `generateLevel`, corta la colocación de enemigos apenas llega al tope.
- **Reaparición** — al morir un enemigo (`TurnSystem.playerAttack`), se llama `trySpawnReplacementEnemy`, que agrega uno nuevo en una celda caminable lejos del jugador (≥12 celdas Manhattan, relajando la distancia si el mapa es chico), solo si el piso sigue por debajo del tope.

Los enemigos no están confinados a la sala donde aparecieron: `CombatSystem.ts` solo valida tile caminable + que no haya otro enemigo, así que pueden cruzar pasillos y otras salas libremente (la IA por `aggroRange` es lo único que acota cuánto se alejan de su punto de aparición sin que el jugador esté cerca).

La **dificultad** (`Difficulty = 'easy' | 'normal' | 'hard'`, `DIFFICULTY_SETTINGS` en `constants.ts`) se elige una sola vez al crear la partida — último paso del flujo "Nueva partida" en `MainMenu.ts`, antes de `Game.startNewGame(slot, difficulty)` — y se persiste en la ranura de guardado (`GameSaveData.difficulty`). Hoy es el único parámetro que controla (el divisor del tope de enemigos); si se le suman más fórmulas de balance, van en el mismo `DIFFICULTY_SETTINGS`.

Detalle completo, incluida la razón de cada decisión de diseño: skills `.claude/skills/enemy-spawning/SKILL.md` y `.claude/skills/difficulty/SKILL.md`.

### Definiciones de enemigos por clase (`src/assets/enemies/`)

Cada tipo de enemigo es una clase que extiende `EnemyBase` (`enemigo_base.ts`): stats (`hp`, `defense`, `attack`), `vision` (rango de detección en casillas — en el runtime existente esto se sigue llamando `aggroRange`; el mapeo lo hace `SpawnSystem.createEnemyInstance()`), `loot` (lista de posibles drops, cada uno con su propia probabilidad y rango de cantidad) y `gold` (rango de oro que suelta al morir, siempre cae, puede ser 0). Cada enemigo se registra por su `type` en `ENEMY_DEFINITIONS` (`index.ts`) — hoy `slime`, `rat` y `skeleton`, migración completa: el viejo `ENEMY_TYPES` plano (`constants.ts`) y el tipo `EnemyDef` se retiraron.

- `TurnSystem.dropLoot()`, llamado al morir un enemigo, tira oro + loot según su entrada en `ENEMY_DEFINITIONS` — el guard por "sin definición" es solo defensivo (guardado corrupto), ya no representa un caso normal.
- El oro ganado se acumula en `player.gold` (persiste en la ranura de guardado, se ve en el HUD) — no hay tienda ni forma de gastarlo todavía.
- `rat`/`skeleton` conservan los stats de combate que tenían en `ENEMY_TYPES`; `vision`/`loot`/`gold` son nuevos, elegidos a criterio siguiendo la progresión rata (más débil) < slime < esqueleto (más fuerte) también en oro/loot.

Detalle completo, incluida la tabla de valores de cada enemigo: `.claude/skills/enemy-definitions/SKILL.md`.

## 8. Muerte del jugador y permadeath

Todo el daño al jugador (combate en `TurnSystem.executeEnemyTurns`, hambre en `TurnSystem.executeWorldEffects`) converge en un único chequeo al final de `TurnSystem.executePlayerAction`:

```ts
if (player.hp <= 0 && game.state !== 'dead') game.handleDeath();
```

Antes de esto, `Game.handleDeath()` existía pero **nunca se llamaba desde ningún lado** — el jugador podía quedar con 0 hp y seguir jugando indefinidamente, tanto por combate como por inanición (hambre en 0 → -1 hp por turno). Ahora es el único punto de detección, sin importar la causa del daño.

`handleDeath()` implementa **permadeath**: guarda las stats finales en la pantalla de muerte, para el autosave, y **borra la ranura de guardado activa** (`deleteSlot`). La pantalla de muerte solo ofrece "Volver al menú" — no hay "Continuar", porque esa partida ya no existe. `saveGame()` tiene un guard (`state === 'dead'` → no-op) para que el autosave o `beforeunload` no puedan resucitar la ranura mientras el jugador todavía ve la pantalla de muerte.

Mientras el jugador está alimentado (`hunger > 0`), `executeWorldEffects()` también regenera 1 hp cada 10 turnos (`HP_REGEN_INTERVAL_TURNS`/`HP_REGEN_AMOUNT`, `constants.ts`) — mutuamente excluyente con el daño por hambre: nunca las dos cosas el mismo turno, y nunca supera `maxHp`.

Detalle completo: `.claude/skills/player-state/SKILL.md`.

## 9. Gobernanza del agente (Claude Code)

`.claude/settings.json` bloquea `git add/commit/merge/push/rebase` para cualquier agente que opere sobre este repositorio (permission `deny` + hook `PreToolUse` sobre la tool `Bash`, cubre también comandos compuestos). El agente puede compilar, testear, editar y crear archivos libremente; el control de versiones (staging, commit, push) lo hace siempre una persona. Ver `CLAUDE.md` para el detalle y el razonamiento.
