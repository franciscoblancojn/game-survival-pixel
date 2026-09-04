---
name: difficulty
description: Usar al tocar la selección de dificultad (Fácil/Normal/Difícil) al crear una partida, su persistencia por ranura, o cualquier fórmula de balance que dependa de ella (ahora mismo, el tope de enemigos). Invocar antes de modificar DIFFICULTY_SETTINGS en constants.ts, el paso de dificultad en MainMenu.ts, o Game.difficulty.
---

# difficulty — Selección y persistencia de dificultad

## Dónde vive cada cosa

| Archivo | Responsabilidad |
|---|---|
| `src/scripts/constants.ts` | `DIFFICULTY_SETTINGS` (label + divisor por dificultad), `DEFAULT_DIFFICULTY` (`'normal'`), `MAX_ENEMIES_BASE`. |
| `src/scripts/types.ts` | `Difficulty = 'easy' \| 'normal' \| 'hard'`, `DifficultySetting`. |
| `src/scripts/components/MainMenu.ts` | Pantalla "Elige la dificultad" — último paso del flujo de Nueva partida, antes de generar la mazmorra. |
| `src/scripts/game/Game.ts` | `game.difficulty` — dueño del valor activo durante la partida. `startNewGame(slot, difficulty)` lo fija; `loadFromSlot` lo restaura. |
| `src/scripts/game/SaveSlots.ts` | Persiste `difficulty` dentro de `GameSaveData` y lo expone en `SlotSummary` para mostrarlo en la lista de ranuras. |

## Valores y qué controlan hoy

```ts
DIFFICULTY_SETTINGS = {
  easy:   { label: 'Fácil',   divisor: 5 },
  normal: { label: 'Normal',  divisor: 3 },
  hard:   { label: 'Difícil', divisor: 1 },
}
```

El `divisor` alimenta la única fórmula que hoy depende de la dificultad — el tope de enemigos vivos por piso (`getMaxEnemies` en `SpawnSystem.ts`, ver skill `enemy-spawning`): `6 + Math.ceil(piso / divisor)`. A menor divisor, más rápido escala la cantidad de enemigos con el piso — por eso `hard` usa `1` (crece un enemigo por piso) y `easy` usa `5` (crece mucho más lento).

**Si agregas una fórmula de balance nueva que deba variar por dificultad** (daño de enemigos, frecuencia de trampas, loot, lo que sea), añade el campo a `DifficultySetting` (`types.ts`) y a las tres entradas de `DIFFICULTY_SETTINGS` — no crees un segundo mapa de dificultad en otro archivo ni hardcodees `if (difficulty === 'hard')` sueltos por el código.

## Cuándo se elige y cómo se propaga

La dificultad se fija **una sola vez, al crear la partida** — no puede cambiarse a mitad de partida (no hay UI para eso, y no se pidió). Flujo completo en `MainMenu.ts`:

```
"Nueva partida" → elegir ranura (vacía = directo, ocupada = confirmar borrado) → elegir dificultad → game.startNewGame(slot, difficulty)
```

`Game.startNewGame(slot, difficulty)` guarda el valor en `this.difficulty` ANTES de generar el piso 1 (`this.dungeon.generateLevel(1, this.difficulty)`), y ese mismo valor se reutiliza en cada piso posterior (`goDownStairs()` también pasa `this.difficulty`) y al reiniciar tras morir (`restart()` pasa `this.difficulty`, no el default — si esto se pierde, una partida "difícil" volvería a "normal" al morir, es una regresión real, no cosmética).

`continueGame(slot)` restaura la dificultad guardada vía `loadFromSlot`: `this.difficulty = data.difficulty ?? DEFAULT_DIFFICULTY` — el fallback es por compatibilidad con partidas guardadas antes de que existiera este campo (mismo patrón que `savedAt` en la skill `save-system`), no lo quites.

## Agregar una dificultad nueva o cambiar los valores

1. Añadir la clave a `Difficulty` (`types.ts`) y su entrada en `DIFFICULTY_SETTINGS` (`constants.ts`).
2. `MainMenu.showDifficulty()` genera las tarjetas iterando `Object.keys(DIFFICULTY_SETTINGS)` — no hay que tocar el `.astro` ni la lista a mano, se agrega sola. Si la nueva dificultad necesita una descripción distinta a la fórmula genérica, añadila a `DIFFICULTY_DESCRIPTIONS` en `MainMenu.ts`.
3. Correr `bun run test` — `SpawnSystem.test.ts` verifica la fórmula del tope para las 3 dificultades actuales; si agregas una cuarta, sumale sus propios casos ahí.

## Testing

`src/__tests__/scripts/game/systems/SpawnSystem.test.ts` cubre `getMaxEnemies` para las 3 dificultades (valores exactos por piso + que difícil siempre permita ≥ enemigos que normal ≥ fácil en el mismo piso). No hay tests de UI para `MainMenu`'s pantalla de dificultad (el proyecto no tiene tests de DOM para overlays por ahora) — si tocas ese flujo, verifica manualmente con `bun run dev` que las 3 tarjetas aparezcan y que elegir una arranque la partida con `game.difficulty` correcto.
