import type { ItemInstance, RecipeStation } from '../../types.js';
import { ITEM_DEFINITIONS } from '../../../assets/items/index.js';
import { createItemInstance } from '../systems/ItemSystem.js';

export interface RecipeDef {
  materials: Record<string, number>;
  result: string;
  name: string;
  quantity?: number;
}

/**
 * RECIPES se deriva de ITEM_DEFINITIONS (src/assets/items/): cada item con
 * `crafteo` + `estacion` definidos aporta su propia receta. Antes esta tabla
 * vivía hardcodeada acá, duplicando los materiales que ya estaban en
 * ITEM_TYPES — mismo riesgo de desincronización que tuvo ENEMY_TYPES con el
 * loot de enemigos antes de esa migración. Ver skill item-definitions.
 */
function buildRecipes(): Record<RecipeStation, Record<string, RecipeDef>> {
  const table: Record<RecipeStation, Record<string, RecipeDef>> = {
    workbench: {},
    furnace: {},
    anvil: {},
    alchemy: {},
  };

  for (const def of Object.values(ITEM_DEFINITIONS)) {
    if (!def.crafteo || !def.estacion) continue;
    table[def.estacion][def.type] = {
      materials: def.crafteo,
      result: def.type,
      name: def.name,
      quantity: def.cantidadCrafteo,
    };
  }

  return table;
}

export const RECIPES: Record<RecipeStation, Record<string, RecipeDef>> = buildRecipes();

export function canCraft(recipe: RecipeDef, inventory: ItemInstance[]): boolean {
  for (const [material, count] of Object.entries(recipe.materials)) {
    let has = 0;
    for (const item of inventory) {
      if (item.type === material) {
        has += item.quantity || 1;
      }
    }
    if (has < count) return false;
  }
  return true;
}

export function craft(recipe: RecipeDef, inventory: ItemInstance[]): ItemInstance {
  // Remove materials
  for (const [material, count] of Object.entries(recipe.materials)) {
    let remaining = count;
    for (let i = inventory.length - 1; i >= 0 && remaining > 0; i--) {
      if (inventory[i].type === material) {
        const qty = inventory[i].quantity || 1;
        if (qty <= remaining) {
          remaining -= qty;
          inventory.splice(i, 1);
        } else {
          inventory[i].quantity = qty - remaining;
          remaining = 0;
        }
      }
    }
  }

  // Item crafteado: construido con createItemInstance para que traiga sus
  // stats reales (attack/defense/heal/hunger/tool/speed/stackable) — antes
  // este objeto se armaba a mano acá y se le olvidaba copiar exactamente
  // esos campos, así que craftear una espada oxidada daba un item sin
  // `attack` (no equipable) y craftear una poción daba uno sin `heal`
  // (no curaba). También forzaba `stackable: true` para cualquier resultado,
  // aunque el item no lo fuera.
  const crafted = createItemInstance(
    recipe.result,
    0,
    0,
    `crafted_${recipe.result}_${Date.now()}`,
    recipe.quantity ?? 1
  );
  if (!crafted) {
    // No debería pasar nunca: RECIPES se deriva de ITEM_DEFINITIONS, así que
    // recipe.result siempre es una clave registrada ahí.
    throw new Error(`craft(): item de resultado desconocido "${recipe.result}"`);
  }

  return crafted;
}
