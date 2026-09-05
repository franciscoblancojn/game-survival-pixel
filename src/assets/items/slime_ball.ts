import { ItemBase } from './item_base.js';

/**
 * Loot de enemigo (ver src/assets/enemies/slime.ts) — antes vivía como
 * entrada suelta en ITEM_TYPES (constants.ts) marcada con el mismo
 * comentario. No tiene `crafteo`: no es ingrediente de ninguna receta hoy.
 */
export class SlimeBall extends ItemBase {
  constructor() {
    super({
      type: 'slime_ball',
      name: 'Bola de slime',
      category: 'material',
      descripcion: 'Masa gelatinosa que sueltan los slimes al morir.',
      valor: 2,
      icon: '🟢',
      color: '#2ecc71',
      stackable: true,
    });
  }
}
