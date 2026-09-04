import { EnemyBase } from './enemigo_base.js';
import { Slime } from './slime.js';

/**
 * Registro central de definiciones de enemigos "nuevo estilo" (clase que
 * hereda de EnemyBase, con vision/loot/oro). SpawnSystem.ts las combina con
 * las entradas viejas de ENEMY_TYPES (constants.ts) que todavía no fueron
 * migradas — ver skill enemy-definitions antes de agregar una nueva.
 *
 * Para agregar un enemigo: crear su archivo en esta carpeta (clase que
 * extiende EnemyBase) y sumarlo acá con su `type` como clave.
 */
export const ENEMY_DEFINITIONS: Record<string, EnemyBase> = {
  slime: new Slime(),
};

export { EnemyBase } from './enemigo_base.js';
export type { EnemyBaseStats } from './enemigo_base.js';
