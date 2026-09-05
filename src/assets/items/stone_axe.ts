import { ItemBase } from './item_base.js';

export class StoneAxe extends ItemBase {
  constructor() {
    super({
      type: 'stone_axe',
      name: 'Hacha de piedra',
      category: 'weapon',
      descripcion: 'Un hacha tosca de piedra atada a un mango de madera.',
      valorMinimo: 12,
      valorMaximo: 26,
      icon: '🪓',
      color: '#888',
      buff: { attack: 5 },
      crafteo: { wood: 2, stone: 3 },
      estacion: 'workbench',
    });
  }
}
