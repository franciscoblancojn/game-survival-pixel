import { ItemBase } from './item_base.js';

export class Torch extends ItemBase {
  constructor() {
    super({
      type: 'torch',
      name: 'Antorcha',
      category: 'tool',
      descripcion: 'Antorcha encendida que ilumina los alrededores.',
      valor: 2,
      icon: '🔥',
      color: '#ffa500',
      tool: 'light',
      crafteo: { wood: 1 },
      estacion: 'workbench',
      cantidadCrafteo: 3,
    });
  }
}
