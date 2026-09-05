import { ItemBase } from './item_base.js';

export class HungerPotion extends ItemBase {
  constructor() {
    super({
      type: 'hunger_potion',
      name: 'Poción de hambre',
      category: 'consumable',
      descripcion: 'Brebaje espeso que sacia el hambre.',
      valor: 10,
      icon: '🍷',
      color: '#ffd93d',
      efectoUso: { comida: 40 },
      crafteo: { wood: 1, leather: 1 },
      estacion: 'alchemy',
    });
  }
}
