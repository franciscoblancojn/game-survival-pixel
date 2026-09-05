import { ItemBase } from './item_base.js';

export class Chainmail extends ItemBase {
  constructor() {
    super({
      type: 'chainmail',
      name: 'Cota de malla',
      category: 'armor',
      descripcion: 'Una cota de malla resistente, tejida con anillos de metal.',
      valor: 25,
      icon: '🦺',
      color: '#888',
      buff: { defense: 5 },
      crafteo: { iron_ore: 4, leather: 2 },
      estacion: 'furnace',
    });
  }
}
