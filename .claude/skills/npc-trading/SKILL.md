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
| `src/scripts/game/world/Dungeon.ts` | `stairsUpPos`/`stairsDownPos` (posición de cada escalera del piso actual), `npcs: NpcInstance[]`, `getNpcAt()`, `generateMarket()` (piso 0, fijo, no procedural), `recomputeStairsFromGrid()` (recalcula las dos posiciones recorriendo el grid, usado al cargar una ranura). |
| `src/scripts/game/systems/NpcSystem.ts` | `createNpcInstances(room)` — coloca una instancia de CADA NPC de `NPC_DEFINITIONS` en fila dentro de la sala del mercado (a diferencia de enemigos/items, no elige al azar: siempre están todos). |
| `src/scripts/game/Market.ts` | Clase `Market` — el "valor actual" de cada relación NPC↔item, persistente durante la partida. `getPrice`, `tradesItem`, `registerBuy`/`registerSell` (mueven el precio), `toJSON`/`fromJSON`. |
| `src/scripts/game/systems/TradeSystem.ts` | `buyItem(game, npcType, itemType)` / `sellItem(...)` — la transacción completa (gold, inventario, mover el precio). Devuelven `{ ok, reason, message }`. |
| `src/scripts/components/MarketUI.ts` + `src/components/Market/index.astro` | Overlay de comercio — lista de compra/venta del NPC activo, diálogo, oro del jugador. |
| `src/scripts/game/Game.ts` | `goDownStairs()`/`goUpStairs()` (transición de piso), `openTrade(npc)`/`closeTrade()` (overlay), estado `'trading'`. |
| `src/scripts/game/systems/TurnSystem.ts` | En el caso `'move'`: pisar una casilla con NPC abre el comercio (sin gastar turno); pisar `STAIRS_DOWN`/`STAIRS_UP` dispara `goDownStairs()`/`goUpStairs()`. |

## Cada piso tiene dos escaleras — no una

Antes solo existía `TILE.STAIRS_DOWN`, colocada en el centro de la última sala, y **nunca se conectaba a nada** (`Game.goDownStairs()` existía pero ningún código lo llamaba — pisar la escalera solo mostraba un mensaje). Ahora:

- `Dungeon.generateLevel()` coloca `TILE.STAIRS_UP` en el centro de la sala inicial (`stairsUpPos`) y `TILE.STAIRS_DOWN` en el centro de la última sala (`stairsDownPos`) — la sala inicial es exactamente donde ya aparecía el jugador, así que la escalera de subida no desplaza nada existente.
- `TurnSystem` dispara `Game.goDownStairs()`/`goUpStairs()` al pisar cada una — antes de esto el mensaje de pisar la escalera no hacía nada.
- Al llegar a un piso **desde arriba** (bajando), el jugador aparece en su `stairsUpPos` (la escalera que lo llevaría de vuelta). Al llegar **desde abajo** (subiendo), aparece en su `stairsDownPos`. Así cada viaje dej al jugador parado justo sobre la escalera que lo regresaría por donde vino.
- **No hay backtracking persistente**: subir o bajar siempre **regenera** el piso de destino con `generateLevel()` (piso nuevo, no el que se había dejado antes) — mismo criterio que Pixel Dungeon. La única excepción es el mercado (ver abajo), que si persiste entre visitas.

## El mercado (piso 0) — fijo, no procedural, persistente

Subir desde el piso 1 no lleva a un "piso 0" procedural — lleva a `Dungeon.generateMarket()`, un piso **fijo** (una sola sala, sin pasillos, sin enemigos) con los 3 NPCs de `NPC_DEFINITIONS` en fila y una única escalera de bajada (`stairsDownPos`) que devuelve al piso 1 (recién generado, como cualquier otra transición). No tiene `stairsUpPos` (es la cima — no hay nada más arriba).

`Game.goUpStairs()` decide entre las dos ramas mirando `dungeon.floor <= 1`:
```ts
if (this.dungeon.floor <= 1) {
  this.dungeon.generateMarket();      // piso 0
} else {
  this.dungeon.generateLevel(this.dungeon.floor - 1, this.difficulty);
}
```

A diferencia de los pisos de la mazmorra, **el mercado no se regenera en cada visita** — los NPCs y sobre todo sus precios (`Game.market`) persisten durante toda la partida. Si tocás `generateMarket()`, no le agregues aleatoriedad a la disposición de NPCs asumiendo que "total, se regenera" — no es así.

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

Si agregás un NPC o tocás la fórmula de precios, corré `bun run test`.
