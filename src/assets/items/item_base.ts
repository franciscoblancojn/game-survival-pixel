import type { RecipeStation } from '../../scripts/types.js';

/** Bonos que el item aporta al equiparse (arma → attack, armadura → defense). */
export interface ItemBuff {
  attack?: number;
  defense?: number;
}

/** Efecto al consumir el item — vida = cura HP, comida = restaura hambre. */
export interface ItemUseEffect {
  vida?: number;
  comida?: number;
}

export interface ItemBaseStats {
  /** Clave interna única — coincide con el nombre del archivo/registro en index.ts (p. ej. 'rusty_sword'). */
  type: string;
  /** Nombre mostrado al jugador. */
  name: string;
  category: 'weapon' | 'armor' | 'tool' | 'consumable' | 'material';
  /** Texto de sabor mostrado en el detalle del inventario. */
  descripcion: string;
  /**
   * Banda de precio en la que puede moverse el "valor actual" de este item
   * en cualquier comerciante — cada NPC (src/assets/npc/) tiene su propio
   * precio actual por item, que sube al comprarlo y baja al venderlo, pero
   * nunca sale de [valorMinimo, valorMaximo]. Ver skill npc-trading.
   */
  valorMinimo: number;
  valorMaximo: number;
  icon: string;
  color: string;
  /** Bonos al equiparlo (solo weapon/armor). */
  buff?: ItemBuff;
  /** Efecto al usarlo/consumirlo (solo consumable). */
  efectoUso?: ItemUseEffect;
  /** Si se apilan varias unidades en un solo slot de inventario (material). */
  stackable?: boolean;
  speed?: number;
  tool?: string;
  /** Materiales requeridos para craftearlo: { itemType: cantidad }. Ausente = no crafteable. */
  crafteo?: Record<string, number>;
  /** Estación de crafteo donde aparece la receta. Requerido si `crafteo` está presente. */
  estacion?: RecipeStation;
  /** Cantidad obtenida por crafteo, si no es 1 (p. ej. torch da 3). */
  cantidadCrafteo?: number;
}

/**
 * Clase base de la que heredan todas las definiciones de items en
 * src/assets/items/. Cada subclase (RustySword, ...) pasa sus propios stats
 * al constructor vía `super({...})` — no hay valores por defecto acá a
 * propósito: una definición de item incompleta debe fallar al escribirla,
 * no jugar con un stat en `undefined`.
 */
export class ItemBase implements ItemBaseStats {
  public readonly type: string;
  public readonly name: string;
  public readonly category: 'weapon' | 'armor' | 'tool' | 'consumable' | 'material';
  public readonly descripcion: string;
  public readonly valorMinimo: number;
  public readonly valorMaximo: number;
  public readonly icon: string;
  public readonly color: string;
  public readonly buff?: ItemBuff;
  public readonly efectoUso?: ItemUseEffect;
  public readonly stackable?: boolean;
  public readonly speed?: number;
  public readonly tool?: string;
  public readonly crafteo?: Record<string, number>;
  public readonly estacion?: RecipeStation;
  public readonly cantidadCrafteo?: number;

  constructor(stats: ItemBaseStats) {
    this.type = stats.type;
    this.name = stats.name;
    this.category = stats.category;
    this.descripcion = stats.descripcion;
    this.valorMinimo = stats.valorMinimo;
    this.valorMaximo = stats.valorMaximo;
    this.icon = stats.icon;
    this.color = stats.color;
    this.buff = stats.buff;
    this.efectoUso = stats.efectoUso;
    this.stackable = stats.stackable;
    this.speed = stats.speed;
    this.tool = stats.tool;
    this.crafteo = stats.crafteo;
    this.estacion = stats.estacion;
    this.cantidadCrafteo = stats.cantidadCrafteo;
  }
}
