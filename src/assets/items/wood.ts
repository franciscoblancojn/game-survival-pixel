import { ItemBase } from './item_base.js';

export class Wood extends ItemBase {
  constructor() {
    super({
      type: 'wood',
      name: 'Madera',
      category: 'material',
      descripcion: 'Trozos de madera recolectados, útiles para craftear.',
      valorMinimo: 1,
      valorMaximo: 3,
      icon: '🪵',
      color: '#8b4513',
      stackable: true,
    });
  }
}
