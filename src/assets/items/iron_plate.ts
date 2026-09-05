import { ItemBase } from './item_base.js';

export class IronPlate extends ItemBase {
  constructor() {
    super({
      type: 'iron_plate',
      name: 'Pechera de hierro',
      category: 'armor',
      descripcion: 'Una pesada pechera de hierro forjado.',
      valorMinimo: 28,
      valorMaximo: 55,
      icon: '🛡️',
      color: '#666',
      buff: { defense: 8 },
      crafteo: { iron_ore: 6 },
      estacion: 'anvil',
    });
  }
}
