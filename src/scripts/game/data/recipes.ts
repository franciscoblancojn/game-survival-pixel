import type { ItemInstance, Recipe, RecipeStation } from '../../types.js';
import { ITEM_TYPES } from '../../constants.js';

export interface RecipeDef {
  materials: Record<string, number>;
  result: string;
  name: string;
  quantity?: number;
}

export const RECIPES: Record<RecipeStation, Record<string, RecipeDef>> = {
  workbench: {
    'rusty_sword': { materials: { wood: 3, stone: 1 }, result: 'rusty_sword', name: 'Espada oxidada' },
    'stone_axe': { materials: { wood: 2, stone: 3 }, result: 'stone_axe', name: 'Hacha de piedra' },
    'torch': { materials: { wood: 1 }, result: 'torch', name: 'Antorcha', quantity: 3 },
    'pickaxe': { materials: { wood: 2, stone: 2 }, result: 'pickaxe', name: 'Pico' },
    'worn_tunic': { materials: { leather: 3 }, result: 'worn_tunic', name: 'Túnica gastada' },
  },
  furnace: {
    'chainmail': { materials: { iron_ore: 4, leather: 2 }, result: 'chainmail', name: 'Cota de malla' },
    'dried_ration': { materials: { wood: 2 }, result: 'dried_ration', name: 'Ración cocida', quantity: 2 },
  },
  anvil: {
    'iron_plate': { materials: { iron_ore: 6 }, result: 'iron_plate', name: 'Pechera de hierro' },
    'sharp_dagger': { materials: { iron_ore: 3, wood: 1 }, result: 'sharp_dagger', name: 'Daga afilada' },
  },
  alchemy: {
    'health_potion': { materials: { wood: 2, stone: 1 }, result: 'health_potion', name: 'Poción de vida' },
    'hunger_potion': { materials: { wood: 1, leather: 1 }, result: 'hunger_potion', name: 'Poción de hambre' },
  },
};

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

  // Return crafted item
  const def = ITEM_TYPES[recipe.result];
  return {
    id: `crafted_${recipe.result}_${Date.now()}`,
    type: recipe.result,
    name: recipe.name,
    quantity: recipe.quantity || 1,
    stackable: true,
    x: 0,
    y: 0,
    icon: def?.icon || '📦',
    color: def?.color || '#ffd93d',
  };
}
