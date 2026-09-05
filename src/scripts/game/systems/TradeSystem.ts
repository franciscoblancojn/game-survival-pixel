import { createItemInstance } from './ItemSystem.js';
import { ITEM_DEFINITIONS } from '../../../assets/items/index.js';
import type { Game } from '../Game.js';

export type TradeReason = 'ok' | 'not_traded' | 'no_gold' | 'inventory_full' | 'no_item';

export interface TradeResult {
  ok: boolean;
  reason: TradeReason;
  message: string;
}

/** El jugador le compra `itemType` a `npcType` — precio actual sale de player.gold, sube tras la compra. */
export function buyItem(game: Game, npcType: string, itemType: string): TradeResult {
  const { player, market } = game;
  const def = ITEM_DEFINITIONS[itemType];

  if (!def || !market.tradesItem(npcType, itemType)) {
    return { ok: false, reason: 'not_traded', message: 'Este comerciante no vende eso.' };
  }

  const price = market.getPrice(npcType, itemType);
  if (player.gold < price) {
    return { ok: false, reason: 'no_gold', message: 'No te alcanza el oro.' };
  }

  const item = createItemInstance(itemType, 0, 0, `bought_${itemType}_${Date.now()}`);
  if (!item || !player.addItem(item)) {
    return { ok: false, reason: 'inventory_full', message: 'Inventario lleno.' };
  }

  player.gold -= price;
  market.registerBuy(npcType, itemType);
  return { ok: true, reason: 'ok', message: `Compraste ${def.name} por ${price} de oro.` };
}

/** El jugador le vende `itemType` a `npcType` — solo si lo tiene en el inventario (no equipado), precio actual va a player.gold, baja tras la venta. */
export function sellItem(game: Game, npcType: string, itemType: string): TradeResult {
  const { player, market } = game;
  const def = ITEM_DEFINITIONS[itemType];

  if (!def || !market.tradesItem(npcType, itemType)) {
    return { ok: false, reason: 'not_traded', message: 'Este comerciante no compra eso.' };
  }

  if (!player.hasItem(itemType, 1)) {
    return { ok: false, reason: 'no_item', message: 'No tenés ese item.' };
  }

  const price = market.getPrice(npcType, itemType);
  player.removeItem(itemType, 1);
  player.gold += price;
  market.registerSell(npcType, itemType);
  return { ok: true, reason: 'ok', message: `Vendiste ${def.name} por ${price} de oro.` };
}
