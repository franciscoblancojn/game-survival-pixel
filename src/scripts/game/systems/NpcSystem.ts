import { NPC_DEFINITIONS } from '../../../assets/npc/index.js';
import type { NpcInstance } from '../../types.js';
import type { Room } from '../world/Room.js';

/**
 * Coloca una instancia de cada NPC registrado en NPC_DEFINITIONS
 * (src/assets/npc/) en fila dentro de la sala del mercado. A diferencia de
 * `createEnemyInstance`/`createItemInstance`, esto no elige al azar entre
 * las definiciones — el mercado siempre tiene a TODOS los NPCs registrados,
 * cada uno en su propia posición fija.
 */
export function createNpcInstances(room: Room): NpcInstance[] {
  const types = Object.keys(NPC_DEFINITIONS);
  const npcs: NpcInstance[] = [];

  const margin = 2;
  const usableWidth = room.width - margin * 2 - 1;
  const y = room.y + 2;

  types.forEach((type, i) => {
    const def = NPC_DEFINITIONS[type];
    const spread = types.length > 1 ? i / (types.length - 1) : 0.5;
    const x = room.x + margin + Math.round(usableWidth * spread);

    npcs.push({
      id: `npc_${type}`,
      type,
      name: def.name,
      x,
      y,
      color: def.color,
    });
  });

  return npcs;
}
