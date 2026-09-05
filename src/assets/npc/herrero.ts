import { NpcBase } from './npc_base.js';

/** Vende y compra armas, armaduras y los metales/cueros para craftearlas. */
export class Herrero extends NpcBase {
  constructor() {
    super({
      type: 'herrero',
      name: 'Grum el Herrero',
      descripcion: 'Un herrero corpulento, con las manos curtidas de años frente a la fragua.',
      color: '#b0552a',
      dialogos: {
        saludo: [
          '¿Buscás algo de metal, viajero?',
          'Mis armas nunca fallan. Bueno, casi nunca.',
        ],
        compra: [
          'Buena elección. Cuídala.',
          'Recién forjada para vos.',
        ],
        venta: [
          'La fundo y le doy otro uso. Trato hecho.',
          'Buen material, esto. Gracias.',
        ],
        sinDinero: [
          'Volvé cuando tengas más oro.',
          'No hago fiado, ni por vos.',
        ],
        despedida: [
          'Que el filo te acompañe.',
          'Cuidate ahí abajo.',
        ],
      },
      inventario: [
        { itemType: 'rusty_sword', precioBase: 13 },
        { itemType: 'stone_axe', precioBase: 19 },
        { itemType: 'sharp_dagger', precioBase: 21 },
        { itemType: 'worn_tunic', precioBase: 11 },
        { itemType: 'chainmail', precioBase: 26 },
        { itemType: 'iron_plate', precioBase: 41 },
        { itemType: 'iron_ore', precioBase: 4 },
        { itemType: 'leather', precioBase: 2 },
      ],
    });
  }
}
