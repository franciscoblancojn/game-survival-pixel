import { INVENTORY_SIZE } from '../constants.js';
import type { Game } from '../game/Game.js';
import type { ItemInstance } from '../types.js';

export class InventoryUI {
  private game: Game;
  public visible: boolean;
  private selectedIndex: number;

  constructor(game: Game) {
    this.game = game;
    this.visible = false;
    this.selectedIndex = -1;
  }

  toggle(): void {
    this.visible = !this.visible;
    this.selectedIndex = -1;
    const el = document.getElementById('inventory-overlay');
    if (el) {
      el.style.display = this.visible ? 'flex' : 'none';
    }
    if (this.visible) this.render();
  }

  render(): void {
    if (!this.visible) return;

    const el = document.getElementById('inventory-overlay');
    if (!el) return;

    const { player } = this.game;
    const slots: { label: string; item: ItemInstance | null; slot: string; index?: number }[] = [];

    slots.push({ label: 'Arma', item: player.equipment.weapon, slot: 'weapon' });
    slots.push({ label: 'Armadura', item: player.equipment.armor, slot: 'armor' });

    for (let i = 0; i < INVENTORY_SIZE; i++) {
      slots.push({ label: '', item: player.inventory[i] || null, slot: 'inv', index: i });
    }

    el.innerHTML = `
      <div class="inventory-panel">
        <div class="inventory-header">
          <h3>🎒 Inventario</h3>
          <button class="inventory-close" onclick="window.gameInstance?.toggleInventory()">✕</button>
        </div>
        <div class="inventory-equipment">
          <div class="equip-slot">
            <span class="equip-label">⚔️ Arma</span>
            <div class="equip-item ${player.equipment.weapon ? 'filled' : ''}">
              ${player.equipment.weapon ? player.equipment.weapon.name : 'Vacío'}
              ${player.equipment.weapon ? `<span class="equip-stat">+${player.equipment.weapon.attack} ATK</span>` : ''}
            </div>
          </div>
          <div class="equip-slot">
            <span class="equip-label">🛡️ Armadura</span>
            <div class="equip-item ${player.equipment.armor ? 'filled' : ''}">
              ${player.equipment.armor ? player.equipment.armor.name : 'Vacío'}
              ${player.equipment.armor ? `<span class="equip-stat">+${player.equipment.armor.defense} DEF</span>` : ''}
            </div>
          </div>
        </div>
        <div class="inventory-grid">
          ${player.inventory.map((item, i) => `
            <div class="inv-slot ${this.selectedIndex === i ? 'selected' : ''}" data-index="${i}">
              <div class="inv-slot-icon" style="color: ${item.color || '#ffd93d'}">${item.icon || '📦'}</div>
              <div class="inv-slot-name">${item.name}</div>
              ${item.quantity > 1 ? `<div class="inv-slot-qty">x${item.quantity}</div>` : ''}
              <div class="inv-slot-info">
                ${item.attack ? `⚔️${item.attack}` : ''}
                ${item.defense ? `🛡️${item.defense}` : ''}
                ${item.heal ? `❤️${item.heal}` : ''}
                ${item.hunger ? `🍖${item.hunger}` : ''}
              </div>
            </div>
          `).join('')}
          ${Array(Math.max(0, INVENTORY_SIZE - player.inventory.length)).fill('').map(() => `
            <div class="inv-slot empty">
              <div class="inv-slot-icon">·</div>
            </div>
          `).join('')}
        </div>
        ${this.selectedIndex >= 0 && player.inventory[this.selectedIndex] ? this.renderItemActions(player.inventory[this.selectedIndex]) : ''}
        <div class="inventory-footer">
          <span>${player.inventory.length}/${INVENTORY_SIZE} items</span>
        </div>
      </div>
    `;

    el.querySelectorAll('.inv-slot[data-index]').forEach(slot => {
      slot.addEventListener('click', () => {
        this.selectedIndex = parseInt((slot as HTMLElement).dataset.index!);
        this.render();
      });
    });
  }

  private renderItemActions(item: ItemInstance): string {
    let actions = '';

    if (item.attack || item.defense) {
      actions += `<button class="inv-action equip" onclick="window.gameInstance?.equipItem(${this.selectedIndex})">Equipar</button>`;
    }
    if (item.heal || item.hunger) {
      actions += `<button class="inv-action use" onclick="window.gameInstance?.useItem(${this.selectedIndex})">Usar</button>`;
    }

    return `
      <div class="inventory-detail">
        <div class="detail-name" style="color: ${item.color || '#ffd93d'}">${item.icon || '📦'} ${item.name}</div>
        <div class="detail-stats">
          ${item.attack ? `⚔️ ATK +${item.attack}` : ''}
          ${item.defense ? `🛡️ DEF +${item.defense}` : ''}
          ${item.heal ? `❤️ Cura ${item.heal} HP` : ''}
          ${item.hunger ? `🍖 Satisface ${item.hunger}` : ''}
        </div>
        <div class="detail-actions">${actions}</div>
      </div>
    `;
  }
}
