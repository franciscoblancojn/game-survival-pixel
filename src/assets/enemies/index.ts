import { EnemyBase } from './enemigo_base.js';
import { Slime } from './slime.js';
import { Rat } from './rat.js';
import { Skeleton } from './skeleton.js';

/**
 * Registro central de definiciones de enemigos: cada uno es una clase que
 * hereda de EnemyBase, con vision/loot/oro. Es la única fuente de verdad
 * para qué enemigos existen — el viejo ENEMY_TYPES plano (constants.ts) fue
 * retirado una vez migrados todos acá. Ver skill enemy-definitions antes de
 * agregar uno nuevo.
 *
 * Para agregar un enemigo: crear su archivo en esta carpeta (clase que
 * extiende EnemyBase) y sumarlo acá con su `type` como clave.
 */
export const ENEMY_DEFINITIONS: Record<string, EnemyBase> = {
  slime: new Slime(),
  rat: new Rat(),
  skeleton: new Skeleton(),
};

export { EnemyBase } from './enemigo_base.js';
export type { EnemyBaseStats } from './enemigo_base.js';
