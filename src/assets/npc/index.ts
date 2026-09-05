import { NpcBase } from './npc_base.js';
import { Herrero } from './herrero.js';
import { Alquimista } from './alquimista.js';
import { Buhonero } from './buhonero.js';

/**
 * Registro central de definiciones de NPCs: cada uno es una clase que
 * hereda de NpcBase, con su lista de tradeo (`inventario`) y `dialogos`. Es
 * la única fuente de verdad para qué NPCs existen — ver skill npc-trading
 * antes de agregar uno nuevo.
 *
 * Para agregar un NPC: crear su archivo en esta carpeta (clase que extiende
 * NpcBase) y sumarlo acá con su `type` como clave. También hay que agregar
 * su posición en `Dungeon.generateMarket()` (src/scripts/game/world/Dungeon.ts).
 */
export const NPC_DEFINITIONS: Record<string, NpcBase> = {
  herrero: new Herrero(),
  alquimista: new Alquimista(),
  buhonero: new Buhonero(),
};

export { NpcBase } from './npc_base.js';
export type { NpcBaseStats, NpcTradeEntry, NpcDialogos } from './npc_base.js';
