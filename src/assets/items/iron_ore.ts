import { ItemBase } from './item_base.js';

export class IronOre extends ItemBase {
  constructor() {
    super({
      type: 'iron_ore',
      name: 'Hierro',
      category: 'material',
      descripcion: 'Mineral de hierro sin refinar.',
      valorMinimo: 2,
      valorMaximo: 6,
      icon: '⬛',
      color: '#666',
      stackable: true,
    });
  }
}
