import { ItemBase } from './item_base.js';

export class HealthPotion extends ItemBase {
  constructor() {
    super({
      type: 'health_potion',
      name: 'Poción de vida',
      category: 'consumable',
      descripcion: 'Poción rojiza que restaura parte de la vida perdida.',
      valor: 15,
      icon: '🧪',
      color: '#ff6b6b',
      efectoUso: { vida: 30 },
      crafteo: { slime_ball: 10 },
      estacion: 'alchemy',
    });
  }
}
