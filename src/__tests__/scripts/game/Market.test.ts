import { describe, it, expect } from "vitest";
import { Market } from "../../../scripts/game/Market.ts";
import { NPC_DEFINITIONS } from "../../../assets/npc/index.ts";
import { ITEM_DEFINITIONS } from "../../../assets/items/index.ts";

const NPC_TYPE = Object.keys(NPC_DEFINITIONS)[0];
const ITEM_TYPE = NPC_DEFINITIONS[NPC_TYPE].inventario[0].itemType;

describe("Market", () => {
  it("arranca cada relación NPC/item en su precioBase", () => {
    const market = new Market();
    for (const [npcType, def] of Object.entries(NPC_DEFINITIONS)) {
      for (const entry of def.inventario) {
        expect(market.getPrice(npcType, entry.itemType)).toBe(entry.precioBase);
      }
    }
  });

  it("tradesItem: true solo para items en el inventario del NPC", () => {
    const market = new Market();
    expect(market.tradesItem(NPC_TYPE, ITEM_TYPE)).toBe(true);
    expect(market.tradesItem(NPC_TYPE, "item_que_no_tradea_nadie")).toBe(false);
    expect(market.tradesItem("npc_inexistente", ITEM_TYPE)).toBe(false);
  });

  it("registerBuy sube el precio, registerSell lo baja", () => {
    const market = new Market();
    const before = market.getPrice(NPC_TYPE, ITEM_TYPE);

    market.registerBuy(NPC_TYPE, ITEM_TYPE);
    expect(market.getPrice(NPC_TYPE, ITEM_TYPE)).toBeGreaterThan(before);

    market.registerSell(NPC_TYPE, ITEM_TYPE);
    market.registerSell(NPC_TYPE, ITEM_TYPE);
    expect(market.getPrice(NPC_TYPE, ITEM_TYPE)).toBeLessThan(before + 1);
  });

  it("nunca saca el precio de la banda [valorMinimo, valorMaximo] del item, ni comprando ni vendiendo mucho", () => {
    const market = new Market();
    const def = ITEM_DEFINITIONS[ITEM_TYPE];

    for (let i = 0; i < 200; i++) market.registerBuy(NPC_TYPE, ITEM_TYPE);
    expect(market.getPrice(NPC_TYPE, ITEM_TYPE)).toBeLessThanOrEqual(def.valorMaximo);

    for (let i = 0; i < 200; i++) market.registerSell(NPC_TYPE, ITEM_TYPE);
    expect(market.getPrice(NPC_TYPE, ITEM_TYPE)).toBeGreaterThanOrEqual(def.valorMinimo);
  });

  it("toJSON/fromJSON hacen ida y vuelta sin perder los precios movidos", () => {
    const market = new Market();
    market.registerBuy(NPC_TYPE, ITEM_TYPE);
    market.registerBuy(NPC_TYPE, ITEM_TYPE);
    const priceBefore = market.getPrice(NPC_TYPE, ITEM_TYPE);

    const saved = market.toJSON();
    const restored = new Market();
    restored.fromJSON(saved);

    expect(restored.getPrice(NPC_TYPE, ITEM_TYPE)).toBe(priceBefore);
  });

  it("fromJSON(undefined) deja los precios por defecto (guardado viejo sin mercado)", () => {
    const market = new Market();
    market.fromJSON(undefined);
    expect(market.getPrice(NPC_TYPE, ITEM_TYPE)).toBe(NPC_DEFINITIONS[NPC_TYPE].inventario[0].precioBase);
  });
});
