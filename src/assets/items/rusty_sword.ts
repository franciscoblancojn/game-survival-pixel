import { ItemBase } from './item_base.js';

export class RustySword extends ItemBase {
  constructor() {
    super({
      type: 'rusty_sword',
      name: 'Espada oxidada',
      category: 'weapon',
      descripcion: 'Una espada oxidada, con el filo desgastado pero aún funcional.',
      valor: 12,
      icon: '⚔️',
      color: '#aaa',
      buff: { attack: 3 },
      crafteo: { wood: 3, stone: 1 },
      estacion: 'workbench',
    });
  }
}
