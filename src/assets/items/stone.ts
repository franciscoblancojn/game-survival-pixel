import { ItemBase } from './item_base.js';

export class Stone extends ItemBase {
  constructor() {
    super({
      type: 'stone',
      name: 'Piedra',
      category: 'material',
      descripcion: 'Piedra común, material básico de construcción.',
      valor: 1,
      icon: '🪨',
      color: '#888',
      stackable: true,
    });
  }
}
