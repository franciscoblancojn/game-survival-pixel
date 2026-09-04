import { EnemyBase } from './enemigo_base.js';

/**
 * Esqueleto — migrado desde ENEMY_TYPES (constants.ts). Mismos hp/ataque/
 * defensa/xp/color/velocidad que tenía antes; `vision` toma el valor que
 * antes era `aggroRange`. `loot` y `gold` son nuevos, elegidos a criterio:
 * es el enemigo más fuerte de los tres, temática de guerrero caído — suelta
 * hierro con más frecuencia y, rara vez, una espada oxidada.
 */
export class Skeleton extends EnemyBase {
  constructor() {
    super({
      type: 'skeleton',
      name: 'Esqueleto',
      hp: 30,
      defense: 2,
      attack: 6,
      vision: 6,
      loot: [
        { itemType: 'iron_ore', chance: 0.35, min: 1, max: 2 },
        { itemType: 'rusty_sword', chance: 0.1, min: 1, max: 1 },
      ],
      gold: { min: 3, max: 15 },
      xp: 12,
      color: '#d4cfc4',
      darkColor: '#a4a094',
      speed: 1,
    });
  }
}
