import { NpcBase } from './npc_base.js';

/** Vende y compra pociones, raciones y restos orgánicos de la mazmorra. */
export class Alquimista extends NpcBase {
  constructor() {
    super({
      type: 'alquimista',
      name: 'Yenna la Alquimista',
      descripcion: 'Rodeada de frascos burbujeantes, mezcla remedios con calma inquietante.',
      color: '#7a4bbd',
      dialogos: {
        saludo: [
          'Ah, un cliente. Pasá, pasá.',
          '¿Herido? Tengo justo lo que necesitás.',
        ],
        compra: [
          'Bébela despacio. O no, vos verás.',
          'Efecto garantizado. Casi siempre.',
        ],
        venta: [
          'Interesante espécimen. Me sirve.',
          'Justo lo que me faltaba para mi próximo brebaje.',
        ],
        sinDinero: [
          'El oro primero, la poción después.',
          'Ni una gota sin pagar.',
        ],
        despedida: [
          'Que no te haga falta, pero llevala igual.',
          'Cuidado con la mezcla.',
        ],
      },
      inventario: [
        { itemType: 'health_potion', precioBase: 16 },
        { itemType: 'hunger_potion', precioBase: 11 },
        { itemType: 'dried_ration', precioBase: 5 },
        { itemType: 'slime_ball', precioBase: 2 },
      ],
    });
  }
}
