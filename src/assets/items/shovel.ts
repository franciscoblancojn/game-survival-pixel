import { ItemBase } from './item_base.js';

export class Shovel extends ItemBase {
  constructor() {
    super({
      type: 'shovel',
      name: 'Pala',
      category: 'tool',
      descripcion: 'Pala resistente para cavar y remover tierra.',
      valorMinimo: 4,
      valorMaximo: 10,
      icon: '🔧',
      color: '#8b7355',
      tool: 'digging',
      // Sin `crafteo`: no tiene receta en ninguna estación todavía (tal
      // como en el sistema plano anterior).
    });
  }
}
