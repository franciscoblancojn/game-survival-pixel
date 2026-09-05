import { ItemBase } from './item_base.js';

export class Pickaxe extends ItemBase {
  constructor() {
    super({
      type: 'pickaxe',
      name: 'Pico',
      category: 'tool',
      descripcion: 'Herramienta minera de mango largo y punta reforzada.',
      valor: 8,
      icon: '⛏️',
      color: '#888',
      tool: 'mining',
      crafteo: { wood: 2, stone: 2 },
      estacion: 'workbench',
    });
  }
}
