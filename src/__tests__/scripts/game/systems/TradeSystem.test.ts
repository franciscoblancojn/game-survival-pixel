import { describe, it, expect } from "vitest";
import { buyItem, sellItem } from "../../../../scripts/game/systems/TradeSystem.ts";
import { Market } from "../../../../scripts/game/Market.ts";
import { Player } from "../../../../scripts/game/entities/Player.ts";
import { NPC_DEFINITIONS } from "../../../../assets/npc/index.ts";
import type { Game } from "../../../../scripts/game/Game.ts";

const NPC_TYPE = Object.keys(NPC_DEFINITIONS)[0];
const ITEM_TYPE = NPC_DEFINITIONS[NPC_TYPE].inventario[0].itemType;

function makeGame(gold: number): Game {
  const player = new Player(0, 0);
  player.gold = gold;
  return { player, market: new Market() } as unknown as Game;
}

describe("buyItem", () => {
  it("con oro suficiente: descuenta el precio, agrega el item, sube el precio", () => {
    const game = makeGame(9999);
    const priceBefore = game.market.getPrice(NPC_TYPE, ITEM_TYPE);

    const result = buyItem(game, NPC_TYPE, ITEM_TYPE);

    expect(result.ok).toBe(true);
    expect(game.player.gold).toBe(9999 - priceBefore);
    expect(game.player.hasItem(ITEM_TYPE, 1)).toBe(true);
    expect(game.market.getPrice(NPC_TYPE, ITEM_TYPE)).toBeGreaterThan(priceBefore);
  });

  it("sin oro suficiente: no descuenta ni agrega nada, reason no_gold", () => {
    const game = makeGame(0);
    const result = buyItem(game, NPC_TYPE, ITEM_TYPE);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("no_gold");
    expect(game.player.gold).toBe(0);
    expect(game.player.hasItem(ITEM_TYPE, 1)).toBe(false);
  });

  it("item que el NPC no tradea: reason not_traded", () => {
    const game = makeGame(9999);
    const result = buyItem(game, NPC_TYPE, "item_que_nadie_tradea");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("not_traded");
  });
});

describe("sellItem", () => {
  it("con el item en inventario: lo quita, suma el precio, baja el precio", () => {
    const game = makeGame(9999);
    buyItem(game, NPC_TYPE, ITEM_TYPE); // asegura tener uno para vender
    const goldAfterBuy = game.player.gold;
    const priceBeforeSell = game.market.getPrice(NPC_TYPE, ITEM_TYPE);

    const result = sellItem(game, NPC_TYPE, ITEM_TYPE);

    expect(result.ok).toBe(true);
    expect(game.player.gold).toBe(goldAfterBuy + priceBeforeSell);
    expect(game.player.hasItem(ITEM_TYPE, 1)).toBe(false);
  });

  it("sin el item en inventario: reason no_item, no cambia oro", () => {
    const game = makeGame(0);
    const result = sellItem(game, NPC_TYPE, ITEM_TYPE);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("no_item");
    expect(game.player.gold).toBe(0);
  });
});
