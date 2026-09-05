import { NPC_DEFINITIONS } from '../../../assets/npc/index.js';
import type { NpcInstance, TileType } from '../../types.js';
import type { Room } from '../world/Room.js';

/**
 * Coloca una instancia de cada NPC registrado en NPC_DEFINITIONS
 * (src/assets/npc/) dentro de `room` — en el mercado (piso 0) y en la sala
 * de comerciantes que aparece cada 5 pisos (`floor % 5 === 0`, ver
 * `Dungeon.generateLevel`). A diferencia de `createEnemyInstance`/
 * `createItemInstance`, esto no elige al azar entre las definiciones: la
 * sala siempre tiene a TODOS los NPCs registrados.
 *
 * Usa `room.getRandomFloorPosition(grid)` (la misma que usan items/
 * enemigos) para que nunca aparezcan sobre un muro, y evita repetir la
 * misma celda entre los NPCs de una sala chica.
 */
export function createNpcInstances(room: Room, grid: TileType[][]): NpcInstance[] {
  const types = Object.keys(NPC_DEFINITIONS);
  const npcs: NpcInstance[] = [];
  const occupied = new Set<string>();

  for (const type of types) {
    const def = NPC_DEFINITIONS[type];

    let pos = room.getRandomFloorPosition(grid);
    let attempts = 0;
    while (occupied.has(`${pos.x},${pos.y}`) && attempts < 20) {
      pos = room.getRandomFloorPosition(grid);
      attempts++;
    }
    occupied.add(`${pos.x},${pos.y}`);

    npcs.push({
      id: `npc_${type}`,
      type,
      name: def.name,
      x: pos.x,
      y: pos.y,
      color: def.color,
    });
  }

  return npcs;
}
