import { EnemyBase } from './enemigo_base.js';

/**
 * Slime — primer enemigo migrado al sistema de definiciones por clase.
 * Antes vivía como una entrada plana en ENEMY_TYPES (constants.ts); esa
 * entrada fue removida para que esta sea la única fuente de verdad.
 */
export class Slime extends EnemyBase {
  constructor() {
    super({
      type: 'slime',
      name: 'Slime',
      hp: 20,
      defense: 0,
      attack: 5,
      vision: 25,
      loot: [
        { itemType: 'slime_ball', chance: 0.5, min: 1, max: 3 },
      ],
      gold: { min: 0, max: 10 },
      xp: 8,
      color: '#2ecc71',
      darkColor: '#27ae60',
      speed: 2,
    });
  }
}
