import { ITEM_DEFINITIONS } from '../../../assets/items/index.js';
import type { ItemInstance } from '../../types.js';

/**
 * Construye una ItemInstance (la forma que consume el resto del motor —
 * inventario, TurnSystem, Dungeon) a partir de una definición en
 * ITEM_DEFINITIONS (src/assets/items/). Devuelve null si `type` no está
 * registrado (guardado corrupto, loot con itemType corrupto) — el llamador
 * decide si ignorarlo en silencio, igual que el guard `if (!def) return`
 * de TurnSystem.dropLoot.
 *
 * `buff`/`efectoUso` de la definición se aplanan a los campos que ya
 * entiende ItemInstance (attack/defense/heal/hunger) — ver skill
 * item-definitions para el porqué de este mapeo.
 */
export function createItemInstance(
  type: string,
  x: number,
  y: number,
  id: string,
  quantity = 1
): ItemInstance | null {
  const def = ITEM_DEFINITIONS[type];
  if (!def) return null;

  return {
    id,
    type: def.type,
    name: def.name,
    x, y,
    quantity,
    stackable: def.stackable || false,
    icon: def.icon,
    color: def.color,
    attack: def.buff?.attack,
    defense: def.buff?.defense,
    heal: def.efectoUso?.vida,
    hunger: def.efectoUso?.comida,
    speed: def.speed,
    tool: def.tool,
  };
}
