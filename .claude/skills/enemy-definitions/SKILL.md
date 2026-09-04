---
name: enemy-definitions
description: Usar al crear un enemigo nuevo o actualizar los stats/loot/oro de uno existente en src/assets/enemies/. Invocar antes de tocar enemigo_base.ts, cualquier archivo de un enemigo concreto (slime.ts, rat.ts, skeleton.ts, ...), index.ts del registro, o los sitios que lo consumen (SpawnSystem.ts, TurnSystem.dropLoot).
---

# enemy-definitions — Crear y actualizar enemigos (src/assets/enemies/)

## Dónde vive cada cosa

| Archivo | Responsabilidad |
|---|---|
| `src/assets/enemies/enemigo_base.ts` | Clase `EnemyBase` — de la que heredan **todos** los enemigos. Stats + `rollLoot()`/`rollGold()`. |
| `src/assets/enemies/<tipo>.ts` | Un archivo por enemigo (`slime.ts`, `rat.ts`, `skeleton.ts`), clase que `extends EnemyBase` y le pasa sus stats a `super({...})`. |
| `src/assets/enemies/index.ts` | `ENEMY_DEFINITIONS: Record<string, EnemyBase>` — registro central y **única fuente de tipos de enemigo del juego**. Todo enemigo nuevo se suma acá. |
| `src/scripts/constants.ts` | `ITEM_TYPES` — acá van los items que un enemigo puede soltar como loot (deben existir ahí para que el drop sea un `ItemInstance` válido). Ya **no** tiene `ENEMY_TYPES` — se retiró al terminar la migración. |
| `src/scripts/game/systems/SpawnSystem.ts` | `createEnemyInstance()` — elige un tipo al azar de `ENEMY_DEFINITIONS` y arma la instancia viva (`EnemyInstance`), mapeando `vision → aggroRange`. |
| `src/scripts/game/systems/TurnSystem.ts` | `dropLoot()` — al matar un enemigo, tira oro + loot según su entrada en `ENEMY_DEFINITIONS`. |

## Ya no hay sistema legado — migración completa

Al principio, todos los enemigos vivían como objetos planos en `ENEMY_TYPES` (`constants.ts`), sin loot ni oro. La migración a clases arrancó con slime, y luego se completó con `rat` y `skeleton` (mismos hp/ataque/defensa/xp/color/velocidad que tenían antes — no se tocó ese balance; `vision` toma el valor que antes era `aggroRange`; `loot`/`oro` son nuevos, elegidos a criterio ya que no existían). `ENEMY_TYPES` y el tipo `EnemyDef` se **eliminaron** de `constants.ts`/`types.ts` — no los reintroduzcas ni leas de ahí, no existen más.

Si en el futuro se pide un enemigo nuevo, sigue el mismo patrón de abajo — no hay ya una distinción "legado vs. nuevo" que mantener.

**No dupliques la lista de tipos en otro lado.** `Dungeon.generateTestRoom()` solía tener su propia lista hardcodeada `['rat', 'slime']` y se rompió cuando slime se movió de `ENEMY_TYPES` (tiraba `Cannot read properties of undefined`). Se arregló usando `createEnemyInstance` de `SpawnSystem.ts` igual que todo lo demás. Si ves una lista de tipos de enemigo escrita a mano en otro archivo, es la misma trampa — reemplazala por `createEnemyInstance`/`Object.keys(ENEMY_DEFINITIONS)`.

## `vision` vs `aggroRange` — no es un error, es el nombre en cada capa

- En la **definición** (`EnemyBase`/subclases), el campo se llama `vision` — "rango de detección del jugador, en casillas", tal como lo pidió el usuario originalmente.
- En el **runtime** (`EnemyInstance`, `CombatSystem.ts`, `TurnSystem.ts`, preexistente), el campo se sigue llamando `aggroRange` — no se renombró en todo el motor para no tocar un sistema que ya funcionaba.
- El mapeo (`vision → aggroRange`) pasa por `SpawnSystem.createEnemyInstance()`. Si necesitás leer el "vision" de un enemigo vivo en la mazmorra, es `enemyInstance.aggroRange` — no existe `enemyInstance.vision`.

## Cómo agregar un enemigo nuevo

1. Crear `src/assets/enemies/<tipo>.ts`:
   ```ts
   import { EnemyBase } from './enemigo_base.js';

   export class Goblin extends EnemyBase {
     constructor() {
       super({
         type: 'goblin',            // clave única, minúsculas, sin espacios
         name: 'Goblin',
         hp: 22,
         defense: 1,
         attack: 5,
         vision: 8,
         loot: [
           { itemType: 'wood', chance: 0.3, min: 1, max: 2 },
         ],
         gold: { min: 1, max: 8 },
         xp: 7,
         color: '#7a9e4a',
         darkColor: '#5a7e3a',
         speed: 1,
       });
     }
   }
   ```
2. Si el loot referencia un item que no existe todavía, agregarlo primero a `ITEM_TYPES` (`constants.ts`) — si el `itemType` no está ahí, `TurnSystem.dropLoot` lo ignora silenciosamente (no revienta, pero tampoco aparece nada en el suelo; no dejes un loot "fantasma").
3. Registrarlo en `src/assets/enemies/index.ts`:
   ```ts
   export const ENEMY_DEFINITIONS: Record<string, EnemyBase> = {
     slime: new Slime(),
     rat: new Rat(),
     skeleton: new Skeleton(),
     goblin: new Goblin(),
   };
   ```
   La clave del registro **debe coincidir** con el `type` pasado en el constructor — hay un test que lo verifica para todas las entradas.
4. No hace falta tocar `SpawnSystem.ts`, `TurnSystem.ts` ni `Dungeon.ts` — recogen automáticamente cualquier clave nueva de `ENEMY_DEFINITIONS`.

## Cómo actualizar un enemigo existente

Editá directamente su archivo (p. ej. `slime.ts`) y cambiá los valores pasados a `super({...})`. No hay estado derivado que recalcular a mano — `SpawnSystem.createEnemyInstance` lee la definición en el momento de spawnear, así que el cambio aplica al próximo enemigo que aparezca (los ya vivos en una partida en curso, o guardados en una ranura, mantienen los stats con los que se crearon — es data ya serializada en `EnemyInstance`, no una referencia viva a la clase).

## `loot` y `oro` — semántica exacta

```ts
loot: [{ itemType: 'slime_ball', chance: 0.5, min: 1, max: 3 }]
gold: { min: 0, max: 10 }
```

- **`loot`** es una lista; cada entrada tira su propia probabilidad de forma **independiente** (`rollLoot()` en `EnemyBase`) — un enemigo puede tener 0, 1 o varias entradas cayendo a la vez si cada una supera su `chance`. `chance` es 0-1 (0.5 = 50%). La cantidad, si cae, es un entero uniforme entre `min` y `max` inclusive.
- **`gold`** siempre "cae" (no tiene probabilidad) — `rollGold()` devuelve un entero uniforme entre `gold.min` y `gold.max` inclusive, que puede ser 0 si `min` es 0 y el sorteo da el mínimo.
- Ambos se resuelven en `TurnSystem.dropLoot()`, llamado desde `playerAttack()` justo cuando `enemy.hp <= 0`: el oro se suma directo a `player.gold`, cada item de loot se agrega a `dungeon.items` en la posición donde murió el enemigo (recogible normalmente, como cualquier item en el suelo).
- El guard `if (!def) return;` en `dropLoot()` es defensivo (p. ej. un `type` corrupto en un guardado viejo) — hoy **todo** enemigo tiene entrada en `ENEMY_DEFINITIONS`, así que no debería activarse en uso normal.

### Valores actuales, por si sirve de referencia de balance

| Enemigo | hp | atk | def | vision | oro | loot |
|---|---|---|---|---|---|---|
| Rata (`rat`) | 15 | 3 | 0 | 4 | 0–5 | Cuero 30% (1) |
| Slime (`slime`) | 20 | 5 | 0 | 25 | 0–10 | Bola de slime 50% (1-3) |
| Esqueleto (`skeleton`) | 30 | 6 | 2 | 6 | 3–15 | Hierro 35% (1-2), Espada oxidada 10% (1) |

Progresión pensada: rata (más débil) < slime < esqueleto (más fuerte), y el oro/loot escala en la misma dirección — no es casualidad, mantené esa relación si reequilibrás alguno.

## Oro del jugador (`player.gold`)

Campo en `Player` (`src/scripts/game/entities/Player.ts`), inicia en 0, persiste en `PlayerSaveData.gold` (guardado/cargado automático, sin migración especial — un guardado viejo sin ese campo simplemente deja `gold` en 0 vía el default del constructor, `Object.assign` en `fromJSON` no lo pisa si no está presente). Se muestra en el HUD (`#hub-gold`, `Hub.ts`) junto a ataque/defensa. No hay todavía tienda ni forma de gastarlo — eso es una feature aparte, no asumas que hay que construirla.

## Testing

- `src/__tests__/assets/enemies/EnemyBase.test.ts` — `rollGold`/`rollLoot` (rango, probabilidad 0/1, independencia entre entradas), stats exactos de `Slime`/`Rat`/`Skeleton`, y que cada entrada de `ENEMY_DEFINITIONS` sea una `EnemyBase` cuyo `type` coincida con su clave en el registro y tenga `loot`/`gold` completos.
- `src/__tests__/scripts/game/systems/SpawnSystem.test.ts` — `createEnemyInstance` puede generar cualquier tipo registrado en `ENEMY_DEFINITIONS`.
- `src/__tests__/scripts/game/systems/CombatSystem.test.ts` § "TurnSystem — botín" — matar cada enemigo suelta oro dentro de su rango; un `type` inexistente (guardado corrupto) no revienta y no suelta nada.

Si agregás o modificás un enemigo, corré `bun run test` — y si agregás loot nuevo, sumale sus propios casos siguiendo el patrón de estos archivos.
