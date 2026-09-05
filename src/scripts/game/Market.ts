import { NPC_DEFINITIONS } from '../../assets/npc/index.js';
import { ITEM_DEFINITIONS } from '../../assets/items/index.js';
import type { MarketSaveData } from '../types.js';

/** Cuánto se mueve el precio en cada compra/venta, como fracción de la banda [valorMinimo, valorMaximo] del item. */
const PRICE_STEP_RATIO = 0.1;

/**
 * Estado persistente del mercado: el "valor actual" de cada relación
 * NPC↔item — sube al comprarle el jugador ese item al NPC (queda más
 * escaso) y baja al vendérselo (queda más abundante), siempre clampeado a
 * [item.valorMinimo, item.valorMaximo]. Vive en `Game.market`, se
 * inicializa una sola vez y persiste durante toda la partida (no se
 * regenera al volver a visitar el mercado, a diferencia de los pisos de la
 * mazmorra). Ver skill npc-trading.
 */
export class Market {
  private precios: Record<string, Record<string, number>>;

  constructor() {
    this.precios = {};
    this.initDefaults();
  }

  private initDefaults(): void {
    for (const [npcType, npc] of Object.entries(NPC_DEFINITIONS)) {
      if (!this.precios[npcType]) this.precios[npcType] = {};
      for (const entry of npc.inventario) {
        if (this.precios[npcType][entry.itemType] === undefined) {
          this.precios[npcType][entry.itemType] = entry.precioBase;
        }
      }
    }
  }

  /** ¿Este NPC comercia con este item? (aparece en su `inventario`). */
  tradesItem(npcType: string, itemType: string): boolean {
    return NPC_DEFINITIONS[npcType]?.inventario.some(e => e.itemType === itemType) ?? false;
  }

  getPrice(npcType: string, itemType: string): number {
    return this.precios[npcType]?.[itemType] ?? 0;
  }

  private step(itemType: string): number {
    const def = ITEM_DEFINITIONS[itemType];
    if (!def) return 1;
    return Math.max(1, Math.round((def.valorMaximo - def.valorMinimo) * PRICE_STEP_RATIO));
  }

  /** El jugador le compra `itemType` a `npcType`: el precio sube (más escaso). */
  registerBuy(npcType: string, itemType: string): void {
    const def = ITEM_DEFINITIONS[itemType];
    if (!def || !this.precios[npcType]) return;
    const current = this.getPrice(npcType, itemType);
    this.precios[npcType][itemType] = Math.min(def.valorMaximo, current + this.step(itemType));
  }

  /** El jugador le vende `itemType` a `npcType`: el precio baja (más oferta). */
  registerSell(npcType: string, itemType: string): void {
    const def = ITEM_DEFINITIONS[itemType];
    if (!def || !this.precios[npcType]) return;
    const current = this.getPrice(npcType, itemType);
    this.precios[npcType][itemType] = Math.max(def.valorMinimo, current - this.step(itemType));
  }

  toJSON(): MarketSaveData {
    return { precios: this.precios };
  }

  /**
   * Restaura precios guardados. Ausente en guardados viejos (`market` se
   * agregó sin bump de STORAGE_VERSION, mismo criterio que `player.gold`) —
   * en ese caso queda en los valores por defecto de `initDefaults()`. Un NPC
   * o item retirado del registro entre versiones simplemente se ignora, no
   * revienta la carga.
   */
  fromJSON(data: MarketSaveData | undefined): void {
    this.precios = {};
    this.initDefaults();
    if (!data) return;

    for (const [npcType, itemPrices] of Object.entries(data.precios)) {
      if (!this.precios[npcType]) continue;
      for (const [itemType, price] of Object.entries(itemPrices)) {
        if (this.precios[npcType][itemType] !== undefined) {
          this.precios[npcType][itemType] = price;
        }
      }
    }
  }
}
