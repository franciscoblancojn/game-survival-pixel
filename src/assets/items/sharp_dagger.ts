import { ItemBase } from './item_base.js';

export class SharpDagger extends ItemBase {
  constructor() {
    super({
      type: 'sharp_dagger',
      name: 'Daga afilada',
      category: 'weapon',
      descripcion: 'Una daga liviana y afilada, ideal para golpes rápidos.',
      valorMinimo: 14,
      valorMaximo: 28,
      icon: '🗡️',
      color: '#ccc',
      buff: { attack: 4 },
      speed: 1,
      crafteo: { iron_ore: 3, wood: 1 },
      estacion: 'anvil',
    });
  }
}
