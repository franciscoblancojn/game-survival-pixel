import { NpcBase } from './npc_base.js';

/** Herramientas y materiales básicos — el comerciante general del mercado. */
export class Buhonero extends NpcBase {
  constructor() {
    super({
      type: 'buhonero',
      name: 'Tobo el Buhonero',
      descripcion: 'Un vendedor ambulante con un carro repleto de herramientas y provisiones.',
      color: '#c9a227',
      dialogos: {
        saludo: [
          '¡Lo mejor a los mejores precios!',
          '¿Herramientas? Tengo de todas.',
        ],
        compra: [
          'Buena inversión, ya vas a ver.',
          'Un placer hacer negocios.',
        ],
        venta: [
          'Siempre hay lugar en el carro para más.',
          'Justo lo que buscaba, gracias.',
        ],
        sinDinero: [
          'Sin oro no hay trato, lo siento.',
          'Volvé con más monedas.',
        ],
        despedida: [
          '¡Buen viaje, viajero!',
          'Volvé cuando quieras.',
        ],
      },
      inventario: [
        { itemType: 'pickaxe', precioBase: 8 },
        { itemType: 'shovel', precioBase: 7 },
        { itemType: 'torch', precioBase: 2 },
        { itemType: 'wood', precioBase: 2 },
        { itemType: 'stone', precioBase: 2 },
      ],
    });
  }
}
