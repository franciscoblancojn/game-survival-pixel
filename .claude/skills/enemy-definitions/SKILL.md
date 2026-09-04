---
name: enemy-definitions
description: Usar al crear un enemigo nuevo o actualizar los stats/loot/oro de uno existente en src/assets/enemies/. Invocar antes de tocar enemigo_base.ts, cualquier archivo de un enemigo concreto (slime.ts, ...), index.ts del registro, o los sitios que lo consumen (SpawnSystem.ts, TurnSystem.dropLoot).
---

# enemy-definitions — Crear y actualizar enemigos (src/assets/enemies/)

## Dónde vive cada cosa

| Archivo | Responsabilidad |
|---|---|
| `src/assets/enemies/enemigo_base.ts` | Clase `EnemyBase` — de la que heredan **todos** los enemigos nuevos. Stats + `rollLoot()`/`rollGold()`. |
| `src/assets/enemies/<tipo>.ts` | Un archivo por enemigo (p. ej. `slime.ts`), clase que `extends EnemyBase` y le pasa sus stats a `super({...})`. |
| `src/assets/enemies/index.ts` | `ENEMY_DEFINITIONS: Record<string, EnemyBase>` — registro central, una instancia por tipo. Todo enemigo nuevo se suma acá. |
| `src/scripts/constants.ts` | `ENEMY_TYPES` — sistema **legado** (rat, skeleton hoy), enemigos planos sin loot/oro, pendientes de migrar. `ITEM_TYPES` — acá van los items que un enemigo puede soltar como loot (deben existir ahí para que el drop sea un `ItemInstance` válido). |
| `src/scripts/game/systems/SpawnSystem.ts` | `getEnemyStats()`/`allEnemyTypeKeys()` — unen `ENEMY_TYPES` (legado) + `ENEMY_DEFINITIONS` (nuevo) en un solo pool para spawnear. |
| `src/scripts/game/systems/TurnSystem.ts` | `dropLoot()` — al matar un enemigo, si tiene entrada en `ENEMY_DEFINITIONS`, tira oro + loot. |

## Por qué existen DOS sistemas de enemigos hoy

Antes de esto, todos los enemigos vivían como objetos planos en `ENEMY_TYPES` (`constants.ts`), sin loot ni oro. La migración a clases (`src/assets/enemies/`) arrancó **solo con slime** — `rat` y `skeleton` siguen en el sistema viejo hasta que se pida migrarlos. **No los migres de oficio** sin que te lo pidan: el usuario fue explícito en arrancar de a uno.

Mientras convivan ambos sistemas:
- `SpawnSystem.allEnemyTypeKeys()` devuelve las claves de los dos (`Object.keys(ENEMY_TYPES)` + `Object.keys(ENEMY_DEFINITIONS)`) — así slime sigue apareciendo en la mazmorra igual que rat/skeleton.
- `SpawnSystem.getEnemyStats(type)` normaliza cualquiera de los dos a la misma forma interna (`{name, hp, attack, defense, xp, aggroRange, color, darkColor, speed}`), mapeando `EnemyBase.vision → aggroRange`. Nunca leas `ENEMY_TYPES[type]` directo en código nuevo — pasá siempre por `getEnemyStats`.
- `TurnSystem.dropLoot(enemy)` busca `ENEMY_DEFINITIONS[enemy.type]` — si no está (rat/skeleton), no suelta nada. Esto es intencional, no un bug: un enemigo legado simplemente no tiene loot/oro definidos todavía.

**No dupliques la lista de tipos en otro lado.** `Dungeon.generateTestRoom()` solía tener su propia lista hardcodeada `['rat', 'slime']` — se rompió apenas slime se movió de `ENEMY_TYPES` (tiraba `Cannot read properties of undefined`). Se arregló haciendo que también use `createEnemyInstance` de `SpawnSystem.ts`. Si ves una lista de tipos de enemigo escrita a mano en otro archivo, es la misma trampa — reemplazala por `createEnemyInstance`/`allEnemyTypeKeys()`.

## `vision` vs `aggroRange` — no es un error, es el nombre en cada capa

- En la **definición** (`EnemyBase`/subclases), el campo se llama `vision` — "rango de detección del jugador, en casillas", tal como lo pidió el usuario.
- En el **runtime** (`EnemyInstance`, `CombatSystem.ts`, `TurnSystem.ts`, ya existía antes de esta skill), el campo se sigue llamando `aggroRange` — no se renombró en todo el motor para no tocar un sistema que ya funcionaba.
- El mapeo pasa por `SpawnSystem.getEnemyStats()`. Si necesitás leer el "vision" de un enemigo vivo en la mazmorra, es `enemyInstance.aggroRange` — no existe `enemyInstance.vision`.

## Cómo agregar un enemigo nuevo

1. Crear `src/assets/enemies/<tipo>.ts`:
   ```ts
   import { EnemyBase } from './enemigo_base.js';

   export class Esqueleto extends EnemyBase {
     constructor() {
       super({
         type: 'esqueleto_nuevo',   // clave única, minúsculas, sin espacios
         name: 'Esqueleto',
         hp: 30,
         defense: 2,
         attack: 6,
         vision: 15,
         loot: [
           { itemType: 'iron_ore', chance: 0.3, min: 1, max: 2 },
         ],
         gold: { min: 2, max: 15 },
         xp: 12,
         color: '#d4cfc4',
         darkColor: '#a4a094',
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
     esqueleto_nuevo: new EsqueletoNuevo(),
   };
   ```
   La clave del registro **debe coincidir** con el `type` pasado en el constructor — hay un test (`ENEMY_DEFINITIONS.test`) que lo verifica para todas las entradas.
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

## Oro del jugador (`player.gold`)

Campo nuevo en `Player` (`src/scripts/game/entities/Player.ts`), inicia en 0, persiste en `PlayerSaveData.gold` (guardado/cargado automático, sin migración especial — un guardado viejo sin ese campo simplemente dejará `gold` en 0 vía el default del constructor, `Object.assign` en `fromJSON` no lo pisa si no está presente). Se muestra en el HUD (`#hub-gold`, `Hub.ts`) junto a ataque/defensa. No hay todavía tienda ni forma de gastarlo — eso es una feature aparte, no asumas que hay que construirla.

## Testing

- `src/__tests__/assets/enemies/EnemyBase.test.ts` — `rollGold`/`rollLoot` (rango, probabilidad 0/1, independencia entre entradas), stats exactos de `Slime`, y que cada entrada de `ENEMY_DEFINITIONS` sea una `EnemyBase` cuyo `type` coincida con su clave en el registro.
- `src/__tests__/scripts/game/systems/SpawnSystem.test.ts` — slime se puede generar aunque ya no esté en `ENEMY_TYPES`, y su `aggroRange` en la instancia viva coincide con `vision` de la definición.
- `src/__tests__/scripts/game/systems/CombatSystem.test.ts` § "TurnSystem — botín" — matar un slime suelta oro en rango y a veces loot; un enemigo legado (rat) no suelta nada.

Si agregás o modificás un enemigo, corré `bun run test` — y si agregás loot nuevo, sumale sus propios casos siguiendo el patrón de estos archivos (no hace falta un test por cada enemigo, pero si tiene una mecánica de loot particular, verificala).
