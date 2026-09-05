import { ItemBase } from './item_base.js';

export class DriedRation extends ItemBase {
  constructor() {
    super({
      type: 'dried_ration',
      // Antes 'Ración seca' (constants.ts ITEM_TYPES) al encontrarla en el
      // suelo pero 'Ración cocida' (recipes.ts RECIPES.furnace) al
      // craftearla — dos nombres para el mismo `type` porque vivían en dos
      // tablas separadas. Ahora que es una sola fuente de verdad se unifica
      // en 'Ración seca'.
      name: 'Ración seca',
      category: 'consumable',
      descripcion: 'Carne seca, alimento simple pero efectivo.',
      valorMinimo: 3,
      valorMaximo: 8,
      icon: '🍖',
      color: '#d2691e',
      efectoUso: { comida: 20 },
      crafteo: { wood: 2 },
      estacion: 'furnace',
      cantidadCrafteo: 2,
    });
  }
}
