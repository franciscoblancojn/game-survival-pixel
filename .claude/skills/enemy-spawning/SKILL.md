---
name: enemy-spawning
description: Usar al tocar la población inicial de enemigos por piso, el reaparecido (respawn) al matar un enemigo, el tope máximo de enemigos vivos, o el movimiento/IA de enemigos por la mazmorra. Invocar antes de modificar src/scripts/game/systems/SpawnSystem.ts, Dungeon.placeEnemies, TurnSystem.playerAttack o CombatSystem.executeEnemyTurn.
---

# enemy-spawning — Población, tope máximo y reaparición de enemigos

## Archivos

| Archivo | Responsabilidad |
|---|---|
| `src/scripts/game/systems/SpawnSystem.ts` | **Única** fuente de verdad para crear enemigos y decidir dónde/si reaparecen. `getMaxEnemies`, `createEnemyInstance`, `trySpawnReplacementEnemy`. |
| `src/scripts/game/world/Dungeon.ts` | `placeEnemies(floor, difficulty)` — población inicial de un piso recién generado, usa `SpawnSystem` y respeta el tope. |
| `src/scripts/game/systems/TurnSystem.ts` | `playerAttack()` — al matar un enemigo, llama `trySpawnReplacementEnemy` para reponerlo en otro lado. |
| `src/scripts/game/systems/CombatSystem.ts` | `executeEnemyTurn`/`moveToward`/`moveRandom` — movimiento e IA de cada enemigo, ya sin restricción de sala (ver más abajo). |

**No dupliques la lógica de creación de enemigos.** Tanto la población inicial de un piso como el reaparecido tras una muerte pasan por `createEnemyInstance(floor, x, y, id)` — si necesitas crear un enemigo en otro lugar del código, usa esa función; no vuelvas a escribir el objeto `EnemyInstance` a mano ni dupliques la fórmula de escalado de stats.

## Tope máximo de enemigos por piso

```
maxEnemies = MAX_ENEMIES_BASE(6) + Math.ceil(piso / divisor)
```

`divisor` sale de `DIFFICULTY_SETTINGS[difficulty]` (`src/scripts/constants.ts`) — ver skill `difficulty` para el detalle de cómo se elige y persiste la dificultad. `getMaxEnemies(floor, difficulty)` en `SpawnSystem.ts` es la única implementación de esta fórmula — no la reimplementes inline en otro archivo.

Ejemplos (piso 1 → piso 10):
- Fácil (divisor 5): 7 → 8
- Normal (divisor 3): 7 → 10
- Difícil (divisor 1): 7 → 16

## Población inicial (`Dungeon.placeEnemies`)

`generateLevel(floor, difficulty)` llama `placeEnemies(floor, difficulty)` después de generar salas/pasillos. El bucle por sala corta apenas se alcanza `maxEnemies` (`if (this.enemies.length >= maxEnemies) break;`) y además recorta el `count` de cada sala para no pasarse (`count = Math.min(count, maxEnemies - this.enemies.length)`). Si agregas un nuevo tipo de sala que también deba spawnear enemigos, respeta este mismo patrón — nunca empujes a `this.enemies` sin chequear el tope primero.

## Reaparición al matar un enemigo

En `TurnSystem.playerAttack`, justo después de `dungeon.removeEnemy(enemy)`:

```ts
trySpawnReplacementEnemy(dungeon, player, dungeon.floor, this.game.difficulty);
```

`trySpawnReplacementEnemy`:
1. Cuenta enemigos vivos (`hp > 0`) — si ya está en `getMaxEnemies(floor, difficulty)`, no hace nada (devuelve `false`).
2. Busca una celda caminable (`Tile.isWalkable`), sin otro enemigo ni el jugador encima, a `ENEMY_RESPAWN_MIN_DISTANCE` (12 celdas Manhattan, `constants.ts`) o más del jugador — **"lejos del jugador"** tal como se pidió.
3. Si el mapa es chico y no encuentra nada a esa distancia en 200 intentos, relaja el mínimo a la mitad y reintenta (`12 → 6 → 3 → 2`), en vez de fallar del todo — preferimos "algo lejos" a "no repone nada".
4. Si encuentra posición, crea el enemigo con `createEnemyInstance` y lo agrega a `dungeon.enemies`.

Esto mantiene la población de un piso estable en el tope una vez alcanzado: cada muerte libera un cupo que `trySpawnReplacementEnemy` vuelve a ocupar en otra parte, indefinidamente (roguelike de desgaste, no un pool finito de enemigos por piso).

## Movimiento de enemigos por toda la mazmorra

`CombatSystem.executeEnemyTurn`/`moveToward`/`moveRandom` **no** restringen el movimiento a la sala donde apareció el enemigo — solo comprueban `dungeon.getTile(nx, ny)` (no `VOID`/`WALL`) y que no haya otro enemigo vivo en esa celda. Un enemigo puede recorrer pasillos y cruzar a otras salas libremente; lo único que acota su comportamiento es la IA (`aggroRange`): persigue al jugador si está a `aggroRange` o menos, si no camina al azar (`moveRandom`), lo que hace que con el tiempo también derive fuera de su sala de origen. Si en el futuro se pide que un enemigo persiga al jugador cruzando TODA la mazmorra (no solo dentro de su `aggroRange`), eso es un cambio de IA en `CombatSystem.ts`, no del sistema de spawn — no lo mezcles acá.

## Testing

- `src/__tests__/scripts/game/systems/SpawnSystem.test.ts` — fórmula de `getMaxEnemies` por dificultad, escalado de stats en `createEnemyInstance`, y `trySpawnReplacementEnemy` (agrega bajo el tope, no agrega en el tope, ignora enemigos muertos al contar, respeta la distancia mínima, nunca aparece sobre el jugador).
- `src/__tests__/scripts/game/world/Dungeon.test.ts` — `generateLevel` nunca puebla un piso por encima de `getMaxEnemies(floor, difficulty)`, para las 3 dificultades.

Si cambias la fórmula del tope, la distancia mínima de reaparición, o el escalado de stats, corre `bun run test` y actualiza estos tests como contrato — no son solo cobertura, documentan el balance acordado.
