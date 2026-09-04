---
name: save-system
description: Usar al tocar el guardado/carga de partida, las 5 ranuras (save slots), el menú principal (Nueva partida/Continuar), el menú de pausa (Continuar/Salir), o el ciclo de vida de Game.ts (init/ensureEngine/startNewGame/continueGame/restart/saveGame). Invocar antes de modificar src/scripts/game/SaveSlots.ts, src/scripts/game/Game.ts, src/scripts/components/MainMenu.ts, src/scripts/components/PauseMenu.ts o sus .astro.
---

# save-system — Ranuras de guardado, menú principal y menú de pausa

## Piezas y quién es dueño de qué

| Archivo | Responsabilidad |
|---|---|
| `src/scripts/game/SaveSlots.ts` | **Única** fuente de verdad para las claves de `localStorage` de partidas. `listSlots`, `loadSlot`, `saveSlot`, `deleteSlot`, `firstFreeSlot`, `migrateLegacySave`. |
| `src/scripts/game/Game.ts` | Dueño del ciclo de vida de la partida activa: `currentSlot`, `startNewGame(slot)`, `continueGame(slot)`, `saveGame()`, `restart()`, `showMainMenu()`, `togglePauseMenu()`, `exitToMenu()`. |
| `src/components/MainMenu/` + `src/scripts/components/MainMenu.ts` | Pantalla de arranque: Nueva partida / Continuar, lista de 5 ranuras, confirmación de borrado. |
| `src/components/PauseMenu/` + `src/scripts/components/PauseMenu.ts` | Botón ⏸️ de la barra inferior durante la partida: Continuar / Salir (guarda y vuelve al menú principal). |
| `src/scripts/components/ConfirmDialog.ts` | `showConfirm(mensaje): Promise<boolean>` — diálogo genérico reutilizado por `MainMenu` para "¿eliminar esta ranura?". |

**No dupliques esta lógica.** Si necesitas leer/escribir una partida, pasa siempre por `SaveSlots.ts` — nunca hagas `localStorage.getItem/setItem` directo con la clave de una ranura en otro archivo.

## Modelo de datos: 5 ranuras, no una sola partida

Antes de esta feature solo existía **una** key (`mazmorra_save`), así que el juego auto-cargaba siempre la misma partida al abrir la página — el mapa nunca cambiaba salvo muriendo. Ahora:

- `SAVE_SLOT_COUNT = 5` (`src/scripts/constants.ts`).
- Cada ranura vive en `localStorage` bajo `` `${STORAGE_KEY}_slot_${id}` `` (id 1..5), construida por `slotKey()` dentro de `SaveSlots.ts` — no reconstruyas esa string en otro lado.
- `GameSaveData` (en `src/scripts/types.ts`) ahora incluye `savedAt: number` (timestamp), usado para mostrar fecha en la lista de ranuras.
- `SlotSummary` (también en `types.ts`) es el resumen liviano que usa la UI: `{ id, empty, floor?, playerLevel?, turn?, savedAt? }` — evita reconstruir `Player`/`Dungeon` completos solo para pintar la lista.
- `migrateLegacySave()` mueve una vez la key vieja (`mazmorra_save`, sin sufijo de ranura) a la primera ranura libre, y la borra. Se llama desde `Game.init()`, antes de mostrar el menú. Si ves código que sigue leyendo `STORAGE_KEY` a secas fuera de esta función, es un bug de regresión.

## Ciclo de vida en `Game.ts`

```
Game.init()                    # arranca SIEMPRE en el menú, nunca auto-carga una partida
  → migrateLegacySave()
  → this.mainMenu = new MainMenu(this)
  → showMainMenu()             # state = 'menu'

MainMenu → elige ranura vacía  → game.startNewGame(slot)
MainMenu → elige ranura llena  → showConfirm(...) → deleteSlot(slot) → game.startNewGame(slot)
MainMenu → Continuar           → game.continueGame(slot)
```

`Renderer`/`Input`/`HUD`/`MiniMap`/`InventoryUI`/`CraftingUI`/`PauseMenu` **no se crean en el constructor de `Game`**, sino en `ensureEngine()` — una función idempotente (guardada con `this.engineReady`) que solo corre la primera vez que hace falta un canvas jugable (dentro de `startNewGame`/`continueGame`). Motivo: `Renderer` necesita un `player`/`dungeon` válidos ya en su constructor (llama `updateCamera()` que lee `player.x`), y esos solo existen después de generar o cargar una partida. Si agregas un componente nuevo que dependa del `player`/`dungeon`, constrúyelo dentro de `ensureEngine()`, no en el constructor de `Game`.

```
startNewGame(slot)             # dungeon nueva + player nuevo, guarda inmediato, autosave 30s
continueGame(slot)             # loadFromSlot(slot); si falla devuelve false y no cambia nada
restart()                      # tras morir: startNewGame(currentSlot) si hay ranura activa, si no showMainMenu()
togglePauseMenu()              # solo alterna entre 'exploring' <-> 'paused'; bloqueado durante otros overlays
exitToMenu()                   # saveGame() + showMainMenu() — vuelve sin perder progreso
saveGame()                     # no-op si currentSlot === null (p. ej. estando en el menú)
```

`saveGame()`/`loadFromSlot()` NUNCA tocan `localStorage` directo — delegan en `saveSlot`/`loadSlot` de `SaveSlots.ts`.

## Estados de `GameState` relevantes

`'menu' | 'exploring' | 'inventory' | 'crafting' | 'dead' | 'paused'` (`src/scripts/types.ts`).

- `'menu'`: pantalla de arranque, el motor de juego puede no existir todavía. `Input` tampoco existe aún en este estado salvo que ya se haya jugado una partida en la misma sesión.
- `'paused'`: igual que `'inventory'`/`'crafting'` para `Input.ts` — bloquea movimiento/acciones (`if (this.game.state !== 'exploring') return;`), pero Escape sí funciona vía `Game.closeOverlay()`, que ahora también revisa `state === 'paused'` y llama `togglePauseMenu()`.

Si agregas un nuevo overlay que deba bloquear el juego, sigue el mismo patrón: nuevo valor en `GameState`, gate en `Input.ts` (ya genérico, no hace falta tocarlo si usas los estados existentes), y una rama en `Game.closeOverlay()` para que Escape lo cierre.

## Agregar una opción nueva al menú de pausa

`PauseMenu` está pensado para crecer (ajustes, "guardar y salir sin confirmar", etc.). Patrón:

1. Botón nuevo en `src/components/PauseMenu/index.astro` (reusa las clases `.mainmenu-btn` / `.mainmenu-btn.primary` ya estilizadas).
2. Listener en el constructor de `PauseMenu.ts`, delegando la acción a un método público de `Game.ts` (no metas lógica de juego dentro de `PauseMenu.ts`, es solo la UI).
3. Si la acción cierra el menú, llama `this.game.togglePauseMenu()` o `this.pauseMenu.close()` — no toques `style.display` a mano desde fuera de `PauseMenu`.

## Testing

`src/__tests__/scripts/game/SaveSlots.test.ts` cubre `SaveSlots.ts` (round-trip, listado, borrado, ranura libre, migración de key vieja, versión incompatible) sin DOM — es puro TS contra `localStorage` (vitest + jsdom lo provee). Si tocas el esquema de `GameSaveData` o el conteo de ranuras, corre `bun run test` y actualiza estos tests como contrato de regresión.
