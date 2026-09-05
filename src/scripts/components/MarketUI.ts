import { NPC_DEFINITIONS } from '../../assets/npc/index.js';
import { ITEM_DEFINITIONS } from '../../assets/items/index.js';
import { buyItem, sellItem } from '../game/systems/TradeSystem.js';
import type { Game } from '../game/Game.js';
import type { NpcInstance } from '../types.js';

/**
 * MarketUI — overlay de comercio con un NPC del mercado (piso 0).
 *
 * El HTML base ya existe en .astro. Solo actualiza contenido dinámico —
 * mismo patrón que CraftingUI.ts.
 */
export class MarketUI {
  private game: Game;
  public visible: boolean;
  public activeNpc: NpcInstance | null;

  constructor(game: Game) {
    this.game = game;
    this.visible = false;
    this.activeNpc = null;
  }

  open(npc: NpcInstance): void {
    this.visible = true;
    this.activeNpc = npc;
    const el = document.getElementById('market-overlay');
    if (el) el.style.display = 'flex';
    this.setDialogue('saludo');
    this.render();
  }

  close(): void {
    if (this.activeNpc) this.setDialogueMessage(this.activeNpc.type, 'despedida');
    this.visible = false;
    this.activeNpc = null;
    const el = document.getElementById('market-overlay');
    if (el) el.style.display = 'none';
  }

  render(): void {
    if (!this.visible || !this.activeNpc) return;
    const def = NPC_DEFINITIONS[this.activeNpc.type];
    if (!def) return;

    const nameEl = document.getElementById('market-npc-name');
    if (nameEl) nameEl.textContent = def.name;

    const descEl = document.getElementById('market-npc-desc');
    if (descEl) descEl.textContent = def.descripcion;

    const goldEl = document.getElementById('market-gold');
    if (goldEl) goldEl.textContent = `💰 ${this.game.player.gold}`;

    this.renderBuyList(def.type);
    this.renderSellList(def.type);
  }

  private setDialogue(situacion: 'saludo' | 'compra' | 'venta' | 'sinDinero' | 'despedida'): void {
    if (!this.activeNpc) return;
    const def = NPC_DEFINITIONS[this.activeNpc.type];
    if (!def) return;
    const el = document.getElementById('market-dialogue');
    if (el) el.textContent = `"${def.randomLine(situacion)}"`;
  }

  private setDialogueMessage(npcType: string, situacion: 'saludo' | 'compra' | 'venta' | 'sinDinero' | 'despedida'): void {
    const def = NPC_DEFINITIONS[npcType];
    if (def) this.game.addMessage(`${def.name}: "${def.randomLine(situacion)}"`);
  }

  private renderBuyList(npcType: string): void {
    const container = document.getElementById('market-buy-list');
    if (!container) return;
    const def = NPC_DEFINITIONS[npcType];
    if (!def) return;

    container.innerHTML = def.inventario
      .map(entry => {
        const itemDef = ITEM_DEFINITIONS[entry.itemType];
        if (!itemDef) return '';
        const price = this.game.market.getPrice(npcType, entry.itemType);
        const affordable = this.game.player.gold >= price;
        return `
        <div class="market-row ${affordable ? '' : 'locked'}">
          <div class="market-row-info">
            <span class="market-row-icon" style="color: ${itemDef.color}">${itemDef.icon}</span>
            <span class="market-row-name">${itemDef.name}</span>
          </div>
          <button class="market-buy-btn" data-item="${entry.itemType}" ${affordable ? '' : 'disabled'}>
            Comprar (${price}🪙)
          </button>
        </div>`;
      })
      .join('');

    container.querySelectorAll('button[data-item]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.handleBuy(npcType, btn.getAttribute('data-item')!);
      });
    });
  }

  private renderSellList(npcType: string): void {
    const container = document.getElementById('market-sell-list');
    if (!container) return;
    const def = NPC_DEFINITIONS[npcType];
    if (!def) return;

    const tradeable = new Set(def.inventario.map(e => e.itemType));
    const sellable = this.game.player.inventory.filter(i => tradeable.has(i.type));

    if (sellable.length === 0) {
      container.innerHTML = '<div class="market-empty">No tenés nada que le interese a este comerciante.</div>';
      return;
    }

    container.innerHTML = sellable
      .map(item => {
        const price = this.game.market.getPrice(npcType, item.type);
        const qty = item.quantity > 1 ? ` x${item.quantity}` : '';
        return `
        <div class="market-row">
          <div class="market-row-info">
            <span class="market-row-icon" style="color: ${item.color}">${item.icon}</span>
            <span class="market-row-name">${item.name}${qty}</span>
          </div>
          <button class="market-sell-btn" data-item="${item.type}">Vender (${price}🪙)</button>
        </div>`;
      })
      .join('');

    container.querySelectorAll('button[data-item]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.handleSell(npcType, btn.getAttribute('data-item')!);
      });
    });
  }

  private handleBuy(npcType: string, itemType: string): void {
    const result = buyItem(this.game, npcType, itemType);
    this.game.addMessage(result.message);
    this.setDialogue(result.reason === 'ok' ? 'compra' : result.reason === 'no_gold' ? 'sinDinero' : 'saludo');
    this.game.hud.render(this.game.player, this.game.dungeon.floor);
    this.render();
  }

  private handleSell(npcType: string, itemType: string): void {
    const result = sellItem(this.game, npcType, itemType);
    this.game.addMessage(result.message);
    this.setDialogue(result.reason === 'ok' ? 'venta' : 'saludo');
    this.game.hud.render(this.game.player, this.game.dungeon.floor);
    this.render();
  }
}
