---
name: map-generation
description: Usar al tocar la generación procedural de mazmorras — salas, pasillos, puertas, tipos de sala, colocación de enemigos/items/escaleras. Invocar antes de modificar src/scripts/game/world/Dungeon.ts, Room.ts o Tile.ts, o al depurar puertas rotas, salas inalcanzables, o patrones de generación extraños.
---

# map-generation — Generación procedural de la mazmorra

## Archivos

| Archivo | Responsabilidad |
|---|---|
| `src/scripts/game/world/Dungeon.ts` | Generación completa de un piso: salas, pasillos, puertas, enemigos, items, escaleras. |
| `src/scripts/game/world/Room.ts` | Una sala: bordes/interior (`writeTiles`), muros internos aleatorios, puertas decorativas (`addDoor`, casi sin uso hoy), posición aleatoria de piso. |
| `src/scripts/game/world/Tile.ts` | Helpers puros sobre `TileType` (`isWalkable`, `isWall`, `isDoor`, `isVoid`, `getName`). |
| `src/scripts/constants.ts` | `TILE` (VOID/FLOOR/WALL/DOOR/CORRIDOR/STAIRS_DOWN/STAIRS_UP), `MAP_WIDTH`/`MAP_HEIGHT`, `ENEMY_TYPES`, `ITEM_TYPES`. |

## Flujo de `Dungeon.generateLevel(floor)`

```
1. initGrid()                         — todo el grid a TILE.VOID
2. Generar N salas rectangulares       — rechaza overlaps (margin=2), hasta numRooms*4 intentos
3. rooms[0].type = 'start'; el resto sortea tipo (normal/enemy/treasure/workshop/trap)
4. room.writeTiles(grid) para cada sala — borde = WALL, interior = FLOOR
5. connectRooms(rooms[i], rooms[i+1]) encadenado — garantiza TODAS las salas conectadas
6. Conexiones extra (~rooms.length/3) para crear loops — dedupeadas contra pares ya conectados
7. addInternalWalls en salas >=7x7     — obstáculos, evita el centro y las puertas ya registradas
8. placeEnemies(floor) / placeItems(floor)
9. Escalera de bajada en el centro de la última sala
```

**Nunca elimines el paso 5 (cadena de `connectRooms`)** — es lo único que garantiza que las N salas formen un solo componente conexo. El bucle "extra" del paso 6 es solo para variedad (loops), no para conectividad.

## `carveCorridor` — cómo se abren las puertas (léelo ANTES de tocarlo)

`connectRooms(roomA, roomB)` traza un pasillo en L entre los centros de dos salas con dos llamadas a `carveCorridor` (una puramente horizontal, otra puramente vertical — nunca ambas a la vez en una sola llamada). Dentro de `carveCorridor`, cada celda del trayecto:

- Si es `VOID` → se convierte en `CORRIDOR`.
- Si es `WALL` → **solo se convierte en `DOOR` si es un cruce real**: veníamos de un `FLOOR` (salimos del interior de una sala) o el siguiente paso entra directo a un `FLOOR` (entramos al interior de otra). Si no es un cruce real, se convierte en `CORRIDOR` igual (para no cortar el camino) pero **no** se registra como puerta.
- Toda puerta real se anota en `room.doors` vía `registerCorridorDoor(x, y)` — busca qué sala contiene esa celda (`room.contains(x, y)`) y evita duplicados.

### Por qué existe esta distinción (dos bugs reales, ya arreglados — no los reintroduzcas)

1. **Puertas que no llevan a ningún lado**: antes, `carveCorridor` dibujaba la puerta en el grid pero nunca la anotaba en `room.doors`. `generateLevel` entonces creía que toda sala estaba sin puerta y le agregaba una decorativa aleatoria (`room.addDoor(side)`) sin pasillo detrás — se abría directo a `TILE.VOID`. Ya no existe ese bloque de relleno: cada sala queda conectada solo por pasillos reales, y `registerCorridorDoor` mantiene `room.doors` sincronizado con la realidad.

2. **"Puertas dobles" / tiras de hasta 8 puertas seguidas**: cuando un pasillo recto corre en **paralelo** al muro de una sala ajena (no la origen/destino de esa conexión) — p. ej. su columna fija coincide con toda la altura del muro este de otra sala — convertir CADA celda de esa tira en `DOOR` dejaba a esa sala sin muro en ese lado. La distinción cruce-real-vs-paralelo (`cameFromFloor || entersFloor`) es lo que corta esto: si no es un cruce real, se abre como `CORRIDOR` (transitable) en vez de `DOOR`.

3. **Ojo con la solución "obvia" de bloquear del todo las celdas que no son cruce real** — se probó y **rompió la conectividad**: ~31% de los niveles generados dejaban salas inalcanzables, porque un solo `WALL` sin convertir en medio de un pasillo recto corta el camino igual, sea o no un cruce "real". Por eso la celda SIEMPRE se abre (como `DOOR` o `CORRIDOR`); lo único que cambia es si cuenta como puerta o no.

Si vas a tocar esta lógica, corre `src/__tests__/scripts/game/world/Dungeon.test.ts` (40 semillas, pisos 1-8) — verifica exactamente estas invariantes: cero puertas sin salida, cero salas inalcanzables desde la sala inicial, tiras de puertas seguidas ≤ 4, y la regla de puertas de abajo. Si tu cambio rompe alguna, no es un detalle cosmético — es una regresión a uno de estos bugs.

## Regla de puertas y `enforceDoorRule` (pasada posterior al carvado)

**Una puerta es SIEMPRE un vano de una sola celda dentro de un muro**: muros a izquierda y derecha (paso vertical) o arriba y abajo (paso horizontal), con las dos celdas del eje de paso transitables. `carveCorridor` no puede garantizarlo solo — decide mirando únicamente el trayecto actual, así que una segunda conexión puede perforar el mismo muro en la celda contigua (vano de 2 = "puertas dobles" pegadas) o rodear de pasillo una celda ya convertida en puerta. Antes del arreglo, el **19,6 %** de las puertas generadas rompía la regla (61 % de los niveles tenía al menos una).

Por eso `generateLevel` llama a `enforceDoorRule()` justo después de conectar las salas y **antes** de `addInternalWalls` (que consume `room.doors`, así que necesita la lista ya depurada). La pasada hace, iterando hasta estabilizar:

1. `pruneDeadEndCorridors()` — borra pasillos con ≤1 vecino transitable (callejones sin salida). Nunca rompe conectividad: una celda con ≤1 vecino no está en el camino entre otras dos.
2. Por cada abertura del anillo de muro de una sala (`wallOpenings()`, DOOR o CORRIDOR) que no cumpla la regla: se intenta **sellar** como `WALL` — con lo que la mitad sobrante de un vano de 2 desaparece y su hermana queda como puerta legal de 1 celda. El sellado solo se acepta si `allRoomsConnected()` sigue siendo cierto; si no, se revierte.
3. Lo que no se pudo sellar sin aislar una sala queda **abierto como `CORRIDOR`**, nunca como puerta: se respeta la regla del punto 3 de arriba (jamás se corta el paso) sin dejar una puerta ilegal.
4. `promoteWallOpenings()` — a la inversa: un vano de una celda que quedó como `CORRIDOR` y sí cumple la regla se asciende a `DOOR` y se registra en `room.doors`. Solo se mira el anillo de muro de las salas: un pasillo suelto con muros a los lados es un pasillo, no una puerta.

Quedan ~1 abertura por nivel que sigue siendo pasillo y no puerta: las de **esquina** de sala (geométricamente nunca pueden cumplir la regla) y las que sellar dejaría una sala inalcanzable. Es intencional — no las conviertas en puerta "para que se vean mejor".

## Room — muros internos y puertas decorativas

- `addInternalWalls(grid, count)`: coloca `count` muros aleatorios dentro de la sala (nunca en el centro exacto ni a distancia ≤1 de una puerta ya en `room.doors`). Requiere que `room.doors` esté poblado ANTES de llamarse — en `generateLevel` esto ya se respeta (paso 7 corre después del paso 5/6).
- `addDoor(side)`: sigue existiendo pero **solo se usa hoy en `generateTestRoom()`** (una sala aislada de prueba/fallback cuando la generación normal produce <2 salas). No la reutilices para el flujo normal de niveles — ahí las puertas nacen exclusivamente de `carveCorridor`/`registerCorridorDoor`.

## Tipos de sala y su rol

| Tipo | Probabilidad (salas != start) | Contenido |
|---|---|---|
| `start` | sala 0, fija | jugador aparece aquí |
| `normal` | 35% | 1-2 enemigos vía `placeEnemies` |
| `enemy` | 20% | 3-5+ enemigos (escala con `floor`) |
| `treasure` | 15% | 2-4 items en `placeItems` |
| `workshop` | 15% | 1 consumible especial |
| `trap` | 15% | sin contenido especial hoy (reservado) |

`placeEnemies`/`placeItems` escalan stats con `floor` (`hp * (1 + floor*0.15)`, `attack`/`defense * (1 + floor*0.1)`) — si cambias el balance, hazlo ahí, no en `CombatSystem.ts` (ver skill del sistema de combate en `CLAUDE.md` si existe, o `src/scripts/game/systems/`).

## Testing

`src/__tests__/scripts/game/world/Dungeon.test.ts` — sin DOM, instancia `Dungeon` real y corre `generateLevel` sobre 40 semillas (pisos 1-8):
1. Ninguna puerta tiene menos de 2 vecinos caminables (puerta sin salida).
2. Todas las salas son alcanzables desde la sala inicial (flood fill).
3. Ninguna tira de puertas seguidas supera 4 celdas.
4. Toda puerta tiene 2 muros enfrentados (regla de puertas) y el eje de paso transitable.
5. `room.doors` está sincronizado con el grid (toda entrada apunta a una celda `TILE.DOOR` real).

Estas tres son el contrato de regresión de la generación de mapas — cualquier cambio en `Dungeon.ts`/`Room.ts` debe seguir pasándolas. Si necesitas relajar el límite del punto 3, hazlo con conocimiento de causa (ver la nota de las "puertas dobles" arriba) y no solo para hacer pasar un test.
