---
name: item-definitions
description: Usar al crear un item nuevo o actualizar buff/valorMinimo/valorMaximo/crafteo/efectoUso de uno existente en src/assets/items/. Invocar antes de tocar item_base.ts, cualquier archivo de un item concreto (rusty_sword.ts, health_potion.ts, ...), index.ts del registro, game/data/recipes.ts, o los sitios que consumen items (Dungeon.ts, TurnSystem.dropLoot, CraftingUI.ts, MarketUI.ts).
---

# item-definitions — Crear y actualizar items (src/assets/items/)

## Dónde vive cada cosa

| Archivo | Responsabilidad |
|---|---|
| `src/assets/items/item_base.ts` | Clase `ItemBase` — de la que heredan **todos** los items. Stats compartidos: `buff`, `efectoUso`, `valorMinimo`/`valorMaximo`, `crafteo`, `estacion`, `descripcion`, etc. |
| `src/assets/items/<tipo>.ts` | Un archivo por item (`rusty_sword.ts`, `health_potion.ts`, `wood.ts`, ...), clase que `extends ItemBase` y le pasa sus stats a `super({...})`. |
| `src/assets/items/index.ts` | `ITEM_DEFINITIONS: Record<string, ItemBase>` — registro central y **única fuente de items del juego** (reemplaza el viejo `ITEM_TYPES` de `constants.ts`, retirado). |
| `src/scripts/game/systems/ItemSystem.ts` | `createItemInstance(type, x, y, id, quantity?)` — única forma de construir una `ItemInstance` (la que consume el resto del motor) a partir de `ITEM_DEFINITIONS`. Devuelve `null` si el `type` no existe. |
| `src/scripts/game/data/recipes.ts` | `RECIPES` **se deriva** de `ITEM_DEFINITIONS` en el momento de importar el módulo — agrupa por `estacion` cada item que tenga `crafteo`. No la edites a mano: si necesitás cambiar una receta, editá el item. |
| `src/scripts/types.ts` | `ItemInstance` — la forma *runtime* de un item (en inventario, en el suelo, etc.), con campos planos `attack`/`defense`/`heal`/`hunger`. Ya **no** tiene `ItemDef` — se retiró al completar la migración. |

## Ya no hay sistema legado — migración completa

Antes todos los items vivían como objetos planos en `ITEM_TYPES` (`constants.ts`), y las recetas de crafteo vivían por separado, hardcodeadas, en `RECIPES` (`game/data/recipes.ts`) — dos tablas con los mismos materiales duplicados a mano. `ITEM_TYPES` y el tipo `ItemDef` se **eliminaron** de `constants.ts`/`types.ts` — no los reintroduzcas ni leas de ahí, no existen más. `RECIPES` ahora se construye leyendo `crafteo`/`estacion` de cada `ItemBase` — un solo lugar para cambiar cuánto cuesta craftear algo.

Si en el futuro se pide un item nuevo, seguí el mismo patrón de abajo.

## `buff` vs runtime plano — no es un error, es el nombre en cada capa

- En la **definición** (`ItemBase`/subclases), los bonos de equipar viven anidados en `buff: { attack?, defense? }` y el efecto de consumir en `efectoUso: { vida?, comida? }` — así lo pidió el usuario originalmente.
- En el **runtime** (`ItemInstance`, `Player.equipItem`/`useItem`, `Inventory.ts`, preexistente), los mismos datos son campos **planos**: `attack`, `defense`, `heal`, `hunger` — no se tocó ese motor para no romper un sistema que ya funcionaba (`equipItem` decide arma-vs-armadura mirando `item.attack`/`item.defense`, `useItem` decide poción-vs-ración mirando `item.heal`/`item.hunger`).
- El mapeo pasa por `createItemInstance()` (`ItemSystem.ts`): `buff.attack → attack`, `buff.defense → defense`, `efectoUso.vida → heal`, `efectoUso.comida → hunger`. Si necesitás leer el "buff" de un item vivo en el suelo o el inventario, es `itemInstance.attack`/`.defense` — no existe `itemInstance.buff`.

## No dupliques la lista de tipos en otro lado

`Dungeon.generateTestRoom()`/`placeItems()` usan arrays de tipos escritos a mano (`materialTypes`, `consumableTypes`, `testItems`) — **eso está bien**, son curadurías de nivel (qué materiales comunes aparecen tirados en el piso vs. qué puede salir de un cofre de tesoro), no una segunda fuente de verdad de "qué items existen". Lo que nunca deben hacer es reconstruir a mano los campos de una `ItemInstance` (icon/color/attack/...) — para eso siempre `createItemInstance(type, x, y, id, quantity?)`, nunca `ITEM_DEFINITIONS[type]` seguido de un objeto literal copiado a mano (esa repetición fue exactamente el bug que dejaba items crafteados sin `attack`/`heal`, ver abajo).

## Cómo agregar un item nuevo

1. Crear `src/assets/items/<tipo>.ts`:
   ```ts
   import { ItemBase } from './item_base.js';

   export class Goblet extends ItemBase {
     constructor() {
       super({
         type: 'goblet',              // clave única, minúsculas, sin espacios
         name: 'Copa dorada',
         category: 'material',
         descripcion: 'Una copa ornamentada, buena para vender.',
         valorMinimo: 10,
         valorMaximo: 20,
         icon: '🏆',
         color: '#ffd700',
         stackable: true,
         // Si es craftable, agregar:
         // crafteo: { iron_ore: 2 },
         // estacion: 'anvil',
         // cantidadCrafteo: 1, // opcional, default 1
       });
     }
   }
   ```
2. Registrarlo en `src/assets/items/index.ts`:
   ```ts
   export const ITEM_DEFINITIONS: Record<string, ItemBase> = {
     ...
     goblet: new Goblet(),
   };
   ```
   La clave del registro **debe coincidir** con el `type` pasado en el constructor — hay un test que lo verifica para todas las entradas.
3. Si es loot de un enemigo, agregar la entrada en `loot` del enemigo correspondiente (`src/assets/enemies/<tipo>.ts`) apuntando a este `type` — ver skill `enemy-definitions`.
4. No hace falta tocar `Dungeon.ts`, `TurnSystem.ts`, `recipes.ts` ni `CraftingUI.ts` — todos leen `ITEM_DEFINITIONS`/`RECIPES` en el momento, así que un item nuevo con `crafteo`+`estacion` aparece solo en el overlay de crafteo de esa estación.

## Cómo actualizar un item existente

Editá directamente su archivo (p. ej. `health_potion.ts`) y cambiá los valores pasados a `super({...})`. `RECIPES` se recalcula al importar el módulo, así que cambiar `crafteo`/`estacion`/`cantidadCrafteo` ahí cambia la receta sin tocar `recipes.ts`. Los items ya colocados en el suelo o guardados en una ranura (`ItemInstance` ya serializada) no cambian retroactivamente — es data ya materializada, no una referencia viva a la clase (mismo comportamiento que los enemigos).

## `crafteo`, `estacion` y `cantidadCrafteo` — semántica exacta

```ts
crafteo: { wood: 2, stone: 1 },  // { itemType: cantidad requerida }
estacion: 'alchemy',              // 'workbench' | 'furnace' | 'anvil' | 'alchemy'
cantidadCrafteo: 2,                // opcional, default 1 (p. ej. torch da 3, dried_ration da 2)
```

- Ambos (`crafteo` y `estacion`) son opcionales, pero **van juntos**: un item con uno y no el otro es una definición a medias (hay un test que lo verifica). Un item sin ninguno de los dos simplemente no aparece en ninguna estación de crafteo.
- `buildRecipes()` (`recipes.ts`) recorre `ITEM_DEFINITIONS` una sola vez al importar el módulo y agrupa cada entrada bajo `RECIPES[estacion][type]`. `canCraft`/`craft` (mismas firmas de siempre) no cambiaron — `CraftingUI.ts` no necesitó ningún cambio.
- `craft()` construye el item resultante con `createItemInstance()` — **antes** armaba el objeto a mano y solo copiaba `icon`/`color`/`quantity`, así que craftear una espada daba un item sin `attack` (no se podía equipar) y craftear una poción daba uno sin `heal` (no curaba); además forzaba `stackable: true` sin mirar el item real. Ambos bugs se arreglaron de paso al migrar — si tocás `craft()` de nuevo, no vuelvas a armar el objeto a mano.

## `valorMinimo`/`valorMaximo` (banda de precio) — el precio real vive en el NPC, no acá

Estos dos campos NO son "el precio" de nada — son la banda `[valorMinimo, valorMaximo]` dentro de la cual puede moverse el **"valor actual"** de ese item en cualquier comerciante. El precio real, que sube al comprarlo y baja al venderlo, es estado dinámico por NPC y vive en `Market` (`src/scripts/game/Market.ts`), no en `ItemBase` — ver skill `npc-trading` antes de tocar esto. `ItemBase` solo pone el techo y el piso que ese precio nunca puede cruzar.

## Testing

- `src/__tests__/assets/items/ItemBase.test.ts` — stats expuestos por `ItemBase`, que `ITEM_DEFINITIONS` tenga clave==`type` en cada entrada, que `crafteo`/`estacion` vayan siempre juntos, `createItemInstance` (aplanado de `buff`/`efectoUso`, `null` en type inexistente), y que `RECIPES`/`craft()` deriven bien de la definición.
- `src/__tests__/scripts/game/world/Dungeon.test.ts` — no referencia items directamente pero corre `placeItems`/`generateTestRoom`, que ahora pasan por `createItemInstance`.

Si agregás o modificás un item, corré `bun run test` — y si agregás una receta nueva, sumale su propio caso a `ItemBase.test.ts` siguiendo el patrón de arriba.
