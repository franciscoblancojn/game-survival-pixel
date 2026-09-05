import { ItemBase } from './item_base.js';

export class Leather extends ItemBase {
  constructor() {
    super({
      type: 'leather',
      name: 'Cuero',
      category: 'material',
      descripcion: 'Cuero curtido, resistente y flexible.',
      valorMinimo: 1,
      valorMaximo: 4,
      icon: '🟫',
      color: '#8b4513',
      stackable: true,
    });
  }
}
