/** Un ítem que este NPC compra y vende, con el precio inicial de esa relación. */
export interface NpcTradeEntry {
  /** Clave en ITEM_DEFINITIONS (src/assets/items/). */
  itemType: string;
  /**
   * Precio inicial ("valor actual") la primera vez que se visita a este NPC.
   * Debe caer dentro de [item.valorMinimo, item.valorMaximo] — hay un test
   * que lo verifica para cada entrada de cada NPC.
   */
  precioBase: number;
}

/** Líneas de diálogo por situación — se elige una al azar de cada lista. */
export interface NpcDialogos {
  saludo: string[];
  compra: string[];
  venta: string[];
  sinDinero: string[];
  despedida: string[];
}

export interface NpcBaseStats {
  /** Clave interna única — coincide con el nombre del archivo/registro en index.ts (p. ej. 'herrero'). */
  type: string;
  /** Nombre mostrado al jugador. */
  name: string;
  descripcion: string;
  dialogos: NpcDialogos;
  /** Items que compra y vende — único origen de qué puede tradearse con este NPC. */
  inventario: NpcTradeEntry[];
  color: string;
}

/**
 * Clase base de la que heredan todas las definiciones de NPCs en
 * src/assets/npc/. Cada subclase (Herrero, ...) pasa sus propios stats al
 * constructor vía `super({...})` — no hay valores por defecto acá a
 * propósito: una definición de NPC incompleta debe fallar al escribirla, no
 * jugar con un stat en `undefined`.
 *
 * Esta clase NO guarda el precio actual — eso es estado que cambia con cada
 * compra/venta (sube al comprar, baja al vender) y vive en `Market`
 * (src/scripts/game/Market.ts), no en la definición estática. `precioBase`
 * de cada `NpcTradeEntry` es solo el punto de partida. Ver skill
 * npc-trading.
 */
export class NpcBase implements NpcBaseStats {
  public readonly type: string;
  public readonly name: string;
  public readonly descripcion: string;
  public readonly dialogos: NpcDialogos;
  public readonly inventario: NpcTradeEntry[];
  public readonly color: string;

  constructor(stats: NpcBaseStats) {
    this.type = stats.type;
    this.name = stats.name;
    this.descripcion = stats.descripcion;
    this.dialogos = stats.dialogos;
    this.inventario = stats.inventario;
    this.color = stats.color;
  }

  /** Elige una línea al azar de una de las listas de dialogos. */
  randomLine(situacion: keyof NpcDialogos): string {
    const lines = this.dialogos[situacion];
    return lines[Math.floor(Math.random() * lines.length)];
  }
}
