import type { Player } from '../game/entities/Player.js';

// Keys on Player that the Hub can sync to DOM
type PlayerKey = keyof Player;

// Hub element IDs map player props → DOM element IDs
const HUB_ELEMENT_MAP: Record<string, PlayerKey> = {
  'hub-level': 'level',
  'hub-hp': 'hp',
  'hub-maxHp': 'maxHp',
  'hub-hunger': 'hunger',
  'hub-maxHunger': 'maxHunger',
  'hub-attack': 'attack',
  'hub-defense': 'defense',
  'hub-xp': 'xp',
  'hub-xpToLevel': 'xpToLevel',
};

/**
 * Hub — State-to-DOM synchronization layer.
 *
 * Acts as an intermediary between the Player state and the DOM.
 * When player state changes, call `syncPlayerState(player)` to
 * update all DOM elements that are bound to player properties.
 *
 * Pattern inspired by the original src/class/hub.ts stub:
 *   Entity → Player → Hub (reads Player, writes to DOM)
 */
export class Hub {
  private container: HTMLElement | null;
  private messageLog: { text: string; time: number }[];
  private readonly maxMessages = 50;
  private readonly visibleMessages = 4;

  constructor() {
    this.container = document.getElementById('hud');
    this.messageLog = [];
  }

  /**
   * Sync player state to DOM elements with hub-* IDs.
   * Also renders the full HUD (bars, stats, messages).
   */
  syncPlayerState(player: Player, floor: number): void {
    if (!this.container) return;

    const hpPct = Math.max(0, player.hp / player.maxHp * 100);
    const hungerPct = Math.max(0, player.hunger / player.maxHunger * 100);
    const xpPct = Math.max(0, player.xp / player.xpToLevel * 100);

    this.container.innerHTML = `
      <div class="hud-bars">
        <div class="hud-bar-row">
          <span class="hud-icon">❤️</span>
          <div class="hud-bar">
            <div class="hud-bar-fill hp" style="width: ${hpPct}%"></div>
          </div>
          <span class="hud-bar-text">${Math.ceil(player.hp)}/${player.maxHp}</span>
        </div>
        <div class="hud-bar-row">
          <span class="hud-icon">🍖</span>
          <div class="hud-bar">
            <div class="hud-bar-fill hunger" style="width: ${hungerPct}%"></div>
          </div>
          <span class="hud-bar-text">${Math.ceil(player.hunger)}/${player.maxHunger}</span>
        </div>
        <div class="hud-bar-row">
          <span class="hud-icon">⭐</span>
          <div class="hud-bar">
            <div class="hud-bar-fill xp" style="width: ${xpPct}%"></div>
          </div>
          <span class="hud-bar-text">Lv${player.level}</span>
        </div>
      </div>
      <div class="hud-stats">
        <span>⚔️ ${player.getEffectiveAttack()}</span>
        <span>🛡️ ${player.getEffectiveDefense()}</span>
        <span>📍 Piso ${floor}</span>
      </div>
      ${this.renderMessages()}
    `;
  }

  /**
   * Update individual hub-* DOM elements by property key.
   * For granular updates without full re-render.
   */
  updateField(player: Player, key: PlayerKey): void {
    const elId = Object.entries(HUB_ELEMENT_MAP).find(([, v]) => v === key)?.[0];
    if (!elId) return;

    const ele = document.getElementById(elId);
    if (ele) {
      const val = player[key];
      ele.textContent = String(val ?? '0');
    }
  }

  addMessage(text: string): void {
    this.messageLog.push({ text, time: Date.now() });
    if (this.messageLog.length > this.maxMessages) {
      this.messageLog.shift();
    }
  }

  private renderMessages(): string {
    const recent = this.messageLog.slice(-this.visibleMessages);
    if (recent.length === 0) return '';

    return `
      <div class="hud-messages">
        ${recent.map(m => `<div class="hud-message">${m.text}</div>`).join('')}
      </div>
    `;
  }
}
