import { ItemBase } from './item_base.js';

export class WornTunic extends ItemBase {
  constructor() {
    super({
      type: 'worn_tunic',
      name: 'Túnica gastada',
      category: 'armor',
      descripcion: 'Una túnica raída que ofrece algo de protección.',
      valor: 10,
      icon: '👕',
      color: '#8b7355',
      buff: { defense: 2 },
      crafteo: { leather: 3 },
      estacion: 'workbench',
    });
  }
}
