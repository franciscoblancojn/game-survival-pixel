---
name: npc-trading
description: Usar al tocar las escaleras de subida/bajada entre pisos, el mercado (piso 0), los NPCs comerciantes o el sistema de precios dinámicos. Invocar antes de tocar src/assets/npc/, Dungeon.generateMarket/stairsUpPos/stairsDownPos, Market.ts, TradeSystem.ts, MarketUI.ts/.astro, o Game.goDownStairs/goUpStairs/openTrade.
---

# npc-trading — Escaleras, mercado y comercio con NPCs

## Dónde vive cada cosa

| Archivo | Responsabilidad |
|---|---|
| `src/assets/npc/npc_base.ts` | Clase `NpcBase` — de la que heredan **todos** los NPCs. `descripcion`, `dialogos` (saludo/compra/venta/sinDinero/despedida), `inventario` (items que tradea + `precioBase`). |
| `src/assets/npc/<tipo>.ts` | Un archivo por NPC (`herrero.ts`, `alquimista.ts`, `buhonero.ts`), clase que `extends NpcBase`. |
| `src/assets/npc/index.ts` | `NPC_DEFINITIONS: Record<string, NpcBase>` — registro central, única fuente de NPCs. |
| `src/scripts/game/world/Dungeon.ts` | `stairsUpPos`/`stairsDownPos` (posición de cada escalera del piso actual), `npcs: NpcInstance[]`, `getNpcAt()`, `generateMarket()` (piso 0, fijo, no procedural), `recomputeStairsFromGrid()` (recalcula las dos posiciones recorriendo el grid), `floorCache`/`goToFloor()` (cachea el piso que se abandona y restaura el de destino si ya se había visitado — ver más abajo). |
| `src/scripts/game/systems/NpcSystem.ts` | `createNpcInstances(room, grid)` — coloca una instancia de CADA NPC de `NPC_DEFINITIONS` dentro de `room`, usando `room.getRandomFloorPosition(grid)` (evita muros y no repite celda) — a diferencia de enemigos/items, no elige al azar entre definiciones: siempre están todos. Se usa tanto en el mercado (piso 0) como en la sala de comerciantes que aparece cada 5 pisos dentro de la mazmorra normal. |
| `src/scripts/game/Market.ts` | Clase `Market` — el "valor actual" de cada relación NPC↔item, persistente durante la partida. `getPrice`, `tradesItem`, `registerBuy`/`registerSell` (mueven el precio), `toJSON`/`fromJSON`. |
| `src/scripts/game/systems/TradeSystem.ts` | `buyItem(game, npcType, itemType)` / `sellItem(...)` — la transacción completa (gold, inventario, mover el precio). Devuelven `{ ok, reason, message }`. |
| `src/scripts/components/MarketUI.ts` + `src/components/Market/index.astro` | Overlay de comercio — lista de compra/venta del NPC activo, diálogo, oro del jugador. |
| `src/scripts/game/Game.ts` | `goDownStairs()`/`goUpStairs()` (transición de piso), `openTrade(npc)`/`closeTrade()` (overlay), estado `'trading'`. |
| `src/scripts/game/systems/TurnSystem.ts` | En el caso `'move'`: pisar una casilla con NPC abre el comercio (sin gastar turno); pisar `STAIRS_DOWN`/`STAIRS_UP` dispara `goDownStairs()`/`goUpStairs()`. |

## Cada piso tiene dos escaleras — no una

Antes solo existía `TILE.STAIRS_DOWN`, colocada en el centro de la última sala, y **nunca se conectaba a nada** (`Game.goDownStairs()` existía pero ningún código lo llamaba — pisar la escalera solo mostraba un mensaje). Ahora:

- `Dungeon.generateLevel()` coloca `TILE.STAIRS_UP` en el centro de la sala inicial (`stairsUpPos`) y `TILE.STAIRS_DOWN` en el centro de la última sala (`stairsDownPos`) — la sala inicial es exactamente donde ya aparecía el jugador, así que la escalera de subida no desplaza nada existente.
- `TurnSystem` dispara `Game.goDownStairs()`/`goUpStairs()` al pisar cada una — antes de esto el mensaje de pisar la escalera no hacía nada.
- Al llegar a un piso **desde arriba** (bajando), el jugador aparece en su `stairsUpPos` (la escalera que lo llevaría de vuelta). Al llegar **desde abajo** (subiendo), aparece en su `stairsDownPos`. Así cada viaje deja al jugador parado justo sobre la escalera que lo regresaría por donde vino.

## `Dungeon.goToFloor()` — el piso vuelve exactamente como quedó

Bajar y volver a subir (o al revés) **restaura el mismo piso**, no genera uno nuevo — antes sí lo hacía, y era un bug real: el usuario bajaba un piso y al subir se encontraba con uno distinto, cuando debía ser el mismo de antes (mismos muros, los enemigos que ya había matado seguían muertos, los items que ya había recogido no reaparecían).

`Dungeon.floorCache: Map<number, FloorState>` guarda cada piso abandonado tal cual quedó — `FloorState` son los datos *vivos* (`rooms: Room[]`, no `RoomData[]`), no una copia. `goToFloor(floor, difficulty)` es el único punto de entrada para cambiar de piso:

```ts
goToFloor(floor: number, difficulty: Difficulty = DEFAULT_DIFFICULTY): void {
  this.floorCache.set(this.floor, this.captureFloorState()); // cachea el que se abandona
  const cached = this.floorCache.get(floor);
  if (cached) { this.applyFloorState(cached); return; }        // ya visitado: se restaura
  if (floor === 0) this.generateMarket(); else this.generateLevel(floor, difficulty); // primera vez: se genera
}
```

`Game.goDownStairs()`/`goUpStairs()` llaman a esto (nunca a `generateLevel`/`generateMarket` directo) — **no vuelvas a llamarlos directo desde ahí**, se te salta el cacheo y se reintroduce el bug. El piso 0 (mercado) entra por el mismo mecanismo: `goToFloor(0, ...)` es lo que dispara `generateMarket()` la primera vez.

## El mercado (piso 0) — fijo, no procedural

Subir desde el piso 1 no lleva a un "piso 0" procedural — lleva a `Dungeon.generateMarket()` (disparado por `goToFloor` cuando el destino es 0), un piso **fijo** (una sola sala, sin pasillos, sin enemigos) con los 3 NPCs de `NPC_DEFINITIONS` y una única escalera de bajada (`stairsDownPos`). No tiene `stairsUpPos` (es la cima — no hay nada más arriba). Como cualquier otro piso, una vez abandonado queda en `floorCache` — la segunda vez que se sube desde el piso 1, se restaura el mismo mercado (con los NPCs donde estaban) en vez de volver a llamar `generateMarket()`. `generateMarket()` no necesita ninguna lógica de "no regenerar en cada visita" propia — eso ya lo resuelve `goToFloor()` para todos los pisos por igual.

**Orden importante dentro de `generateMarket()`**: `stairsDownPos` se calcula y se escribe en el grid (`TILE.STAIRS_DOWN`) ANTES de llamar a `createNpcInstances()`, no después. La escalera del mercado no está en el centro de la sala (a diferencia de un piso normal, donde `getRandomFloorPosition` ya evita el centro por otra razón) — si un NPC pudiera caer justo en esa celda porque todavía es `TILE.FLOOR` en el momento de colocarlo, bloquearía la transición de piso: `TurnSystem` chequea NPC antes que escalera al pisar una celda, así que pisar esa casilla abriría el comercio en vez de bajar. Si tocás este método, no inviertas el orden.

## La sala de comerciantes — cada 5 pisos, dentro de la mazmorra normal

Además del mercado (piso 0), **cada piso con `floor % 5 === 0`** (5, 10, 15, ...) tiene una sala más dentro de la mazmorra procedural con los mismos NPCs — `Dungeon.generateLevel()` elige una sala al azar (nunca la inicial) y le pone `type = 'merchant'`, pisando el tipo que le hubiera tocado en el sorteo normal. Esa sala:

- No recibe enemigos (`placeEnemies` no reconoce `'merchant'`, ni el branch de `'enemy'` ni el de `'normal'` matchean, así que el conteo queda en 0 sin código especial).
- No recibe los materiales sueltos genéricos que sí le tocan al resto de las salas en `placeItems` (60% de probabilidad para cualquier otro tipo) — un item debajo de un NPC quedaría inalcanzable, ver nota de `createNpcInstances` arriba.
- Sí puede tener el consumible de `'workshop'`/tesoro de `'treasure'` si por casualidad su tipo original era ese antes de pisarlo — no, en realidad no: al pisar el tipo a `'merchant'` esos branches (`room.type === 'treasure'`/`'workshop'`) tampoco matchean. Una sala de comerciantes es limpia: solo los NPCs.
- Se puebla con `createNpcInstances(merchantRoom, this.grid)` DESPUÉS de `placeEnemies`/`placeItems`, antes de escribir las escaleras — el orden acá no importa igual que en el mercado, porque `stairsUpPos`/`stairsDownPos` de un piso normal van al **centro** de la sala inicial/última, y `getRandomFloorPosition` ya evita el centro siempre, sin depender de que el grid ya tenga la escalera escrita.

## `Market` — el "valor actual" sube al comprar, baja al vender

```ts
market.getPrice(npcType, itemType)     // precio actual de esa relación
market.tradesItem(npcType, itemType)   // ¿este NPC tradea este item?
market.registerBuy(npcType, itemType)  // el jugador compró: precio sube (más escaso)
market.registerSell(npcType, itemType) // el jugador vendió: precio baja (más oferta)
```

- El precio inicial de cada relación NPC↔item es `precioBase` (definido en el `inventario` del NPC, ver `NpcTradeEntry`) — **debe** caer dentro de `[item.valorMinimo, item.valorMaximo]`, hay un test que lo verifica para cada NPC.
- Cada compra/venta mueve el precio un paso de `Math.round((valorMaximo - valorMinimo) * 0.1)` (mínimo 1), siempre clampeado a la banda del item — nunca sale de `[valorMinimo, valorMaximo]` sin importar cuántas veces se compre/venda seguido.
- Un mismo item puede tener un precio distinto en cada NPC (cada uno tiene su propia entrada independiente) — no hay "el precio global de la espada", hay "el precio de la espada en el herrero".
- **Solo se puede vender lo que el NPC tradea** (`tradesItem`) — no se le puede vender una poción al herrero aunque el jugador la tenga. Y solo se vende lo que está en `player.inventory` (no lo equipado) — `Player.hasItem`/`removeItem` ya funcionan así, no hace falta lógica extra de desequipar.
- Persiste en el guardado (`GameSaveData.market`, campo opcional — ausente en guardados viejos, `Market.fromJSON(undefined)` deja los precios en sus `precioBase` por defecto, mismo criterio que `player.gold` cuando se agregó).

## Persistencia de `floorCache` en el guardado

`GameSaveData.floors?: Record<number, DungeonSaveData>` (campo opcional, ausente en guardados viejos = sin pisos cacheados todavía, no rompe la carga) guarda cada entrada de `dungeon.floorCache` — el piso activo sigue yendo en `GameSaveData.dungeon` como siempre, `floors` es el resto. `Game.saveGame()`/`loadFromSlot()` convierten entre la forma viva (`FloorState`, `rooms: Room[]`) y la serializable (`DungeonSaveData`, `rooms: RoomData[]`) con `Room.toData()`/`Room.fromData()` — dos helpers estáticos en `Room.ts`, usados tanto para el piso activo como para cada piso cacheado, no dupliques esa conversión a mano en otro lado.

## Diálogos (`NpcBase.dialogos`)

Cinco listas por NPC — `saludo` (al abrir el comercio), `compra`/`venta` (tras una operación exitosa), `sinDinero` (compra fallida por oro insuficiente), `despedida` (al cerrar el overlay). `NpcBase.randomLine(situacion)` elige una línea al azar de la lista pedida. `MarketUI` decide qué lista mostrar según el `reason` que devuelve `TradeSystem.buyItem`/`sellItem` (`'ok'` → compra/venta, `'no_gold'` → sinDinero) — no matchea el string del mensaje, usa el reason code.

## Cómo agregar un NPC nuevo

1. Crear `src/assets/npc/<tipo>.ts` (clase que extiende `NpcBase`, con `dialogos` completo y `inventario: NpcTradeEntry[]` — cada entrada con un `itemType` que exista en `ITEM_DEFINITIONS` y un `precioBase` dentro de su banda).
2. Registrarlo en `src/assets/npc/index.ts` con su `type` como clave (mismo contrato que enemigos/items: la clave del registro debe coincidir con `type`).
3. `Dungeon.generateMarket()`/`createNpcInstances()` lo recogen automáticamente (recorren `Object.keys(NPC_DEFINITIONS)`) — no hace falta tocar `Dungeon.ts` para que aparezca en el mercado.

## Testing

- `src/__tests__/assets/npc/NpcBase.test.ts` — stats de `NpcBase`, que cada `precioBase` de `NPC_DEFINITIONS` caiga dentro de la banda de su item, que la clave del registro coincida con `type`.
- `src/__tests__/scripts/game/Market.test.ts` — `registerBuy`/`registerSell` mueven el precio en la dirección correcta y lo clampean a `[valorMinimo, valorMaximo]`; `tradesItem` respeta el `inventario` del NPC; `toJSON`/`fromJSON` sobreviven un guardado/carga.
- `src/__tests__/scripts/game/world/Dungeon.test.ts` — cada piso generado tiene `stairsUpPos` y `stairsDownPos` (o solo uno de los dos, si es el mercado), y son alcanzables.
- `src/__tests__/scripts/game/Game.stairs-market.test.ts` — integración de punta a punta con un `Game` real (canvas/ctx falsos): caminar sobre cada escalera dispara la transición correcta, hablar con un NPC no gasta turno, y — el bug que motivó `floorCache` — un piso abandonado vuelve exactamente igual (mismo `grid`, enemigos muertos siguen muertos, items recogidos no reaparecen), incluso tras un guardado/carga de ranura real.

Si agregás un NPC, tocás la fórmula de precios, o tocás `goToFloor`/`floorCache`, corré `bun run test`.
