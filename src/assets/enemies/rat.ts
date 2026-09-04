import { EnemyBase } from './enemigo_base.js';

/**
 * Rata — migrada desde ENEMY_TYPES (constants.ts). Mismos hp/ataque/
 * defensa/xp/color/velocidad que tenía antes (no se tocó el balance
 * existente); `vision` toma el valor que antes era `aggroRange`. `loot` y
 * `gold` son nuevos — no existían en el sistema viejo — elegidos a criterio:
 * es el enemigo más débil de los tres, así que suelta poco y de bajo valor.
 */
export class Rat extends EnemyBase {
  constructor() {
    super({
      type: 'rat',
      name: 'Rata',
      hp: 15,
      defense: 0,
      attack: 3,
      vision: 4,
      loot: [
        { itemType: 'leather', chance: 0.3, min: 1, max: 1 },
      ],
      gold: { min: 0, max: 5 },
      xp: 5,
      color: '#a0826d',
      darkColor: '#7a624d',
      speed: 1,
    });
  }
}
