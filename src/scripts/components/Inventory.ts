import { INVENTORY_SIZE } from '../constants.js';
import type { Game } from '../game/Game.js';
import type { ItemInstance } from '../types.js';

/**
 * InventoryUI — Gestiona el overlay de inventario.
 * 
 * El HTML base ya existe en .astro. Solo actualiza contenido dinámico.
 */
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

    const { player } = this.game;

    // Actualizar equipo
    this.updateEquipment('equip-weapon', player.equipment.weapon, '⚔️');
    this.updateEquipment('equip-armor', player.equipment.armor, '🛡️');

    // Actualizar grid de inventario
    this.renderInventoryGrid(player.inventory);

    // Actualizar contador
    const countEl = document.getElementById('inventory-count');
    if (countEl) {
      countEl.textContent = `${player.inventory.length}/${INVENTORY_SIZE} items`;
    }

    // Actualizar detalle si hay selección
    this.renderItemDetail(player.inventory);
  }

  private updateEquipment(
    elementId: string,
    item: ItemInstance | null,
    icon: string
  ): void {
    const el = document.getElementById(elementId);
    if (!el) return;

    if (item) {
      el.classList.add('filled');
      el.innerHTML = `${item.name}<span class="equip-stat">+${icon === '⚔️' ? item.attack : item.defense}</span>`;
    } else {
      el.classList.remove('filled');
      el.textContent = 'Vacío';
    }
  }

  private renderInventoryGrid(inventory: (ItemInstance | null)[]): void {
    const grid = document.getElementById('inventory-grid');
    if (!grid) return;

    let html = '';

    for (let i = 0; i < INVENTORY_SIZE; i++) {
      const item = inventory[i];
      const isSelected = this.selectedIndex === i;

      if (item) {
        html += `
          <div class="inv-slot ${isSelected ? 'selected' : ''}" data-index="${i}">
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
        `;
      } else {
        html += `
          <div class="inv-slot empty" data-index="${i}">
            <div class="inv-slot-icon">·</div>
          </div>
        `;
      }
    }

    grid.innerHTML = html;

    // Agregar event listeners
    grid.querySelectorAll('.inv-slot[data-index]').forEach(slot => {
      slot.addEventListener('click', () => {
        this.selectedIndex = parseInt((slot as HTMLElement).dataset.index!);
        this.render();
      });
    });
  }

  private renderItemDetail(inventory: (ItemInstance | null)[]): void {
    const detailEl = document.getElementById('inventory-detail');
    if (!detailEl) return;

    if (this.selectedIndex < 0 || !inventory[this.selectedIndex]) {
      detailEl.style.display = 'none';
      return;
    }

    const item = inventory[this.selectedIndex]!;
    detailEl.style.display = 'block';

    let actions = '';
    if (item.attack || item.defense) {
      actions += `<button class="inv-action equip" data-action="equip" data-index="${this.selectedIndex}">Equipar</button>`;
    }
    if (item.heal || item.hunger) {
      actions += `<button class="inv-action use" data-action="use" data-index="${this.selectedIndex}">Usar</button>`;
    }

    detailEl.innerHTML = `
      <div class="detail-name" style="color: ${item.color || '#ffd93d'}">${item.icon || '📦'} ${item.name}</div>
      <div class="detail-stats">
        ${item.attack ? `⚔️ ATK +${item.attack}` : ''}
        ${item.defense ? `🛡️ DEF +${item.defense}` : ''}
        ${item.heal ? `❤️ Cura ${item.heal} HP` : ''}
        ${item.hunger ? `🍖 Satisface ${item.hunger}` : ''}
      </div>
      <div class="detail-actions">${actions}</div>
    `;

    // Agregar event listeners para acciones
    detailEl.querySelectorAll('button[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        const index = parseInt(btn.getAttribute('data-index')!);
        
        if (action === 'equip') {
          this.game.equipItem(index);
        } else if (action === 'use') {
          this.game.useItem(index);
        }
      });
    });
  }
}
