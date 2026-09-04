import type { Player } from '../game/entities/Player.js';

/**
 * Hub — State-to-DOM synchronization layer.
 *
 * Actualiza elementos HTML que ya existen en el DOM (definidos en .astro).
 * NO genera HTML - solo actualiza textContent e innerHTML de elementos existentes.
 */
export class Hub {
  private messageLog: { text: string; time: number }[];
  private readonly maxMessages = 50;
  private readonly visibleMessages = 4;

  constructor() {
    this.messageLog = [];
  }

  /**
   * Sync player state to DOM elements with hub-* IDs.
   * Solo actualiza valores, no genera HTML.
   */
  syncPlayerState(player: Player, floor: number): void {
    // Actualizar barras de progreso
    const hpPct = Math.max(0, (player.hp / player.maxHp) * 100);
    const hungerPct = Math.max(0, (player.hunger / player.maxHunger) * 100);
    const xpPct = Math.max(0, (player.xp / player.xpToLevel) * 100);

    // HP bar
    const hpBar = document.getElementById('hub-hp-bar');
    if (hpBar) hpBar.style.width = `${hpPct}%`;

    const hpText = document.getElementById('hub-hp-text');
    if (hpText) hpText.textContent = `${Math.ceil(player.hp)}/${player.maxHp}`;

    // Hunger bar
    const hungerBar = document.getElementById('hub-hunger-bar');
    if (hungerBar) hungerBar.style.width = `${hungerPct}%`;

    const hungerText = document.getElementById('hub-hunger-text');
    if (hungerText) hungerText.textContent = `${Math.ceil(player.hunger)}/${player.maxHunger}`;

    // XP bar
    const xpBar = document.getElementById('hub-xp-bar');
    if (xpBar) xpBar.style.width = `${xpPct}%`;

    const levelText = document.getElementById('hub-level-text');
    if (levelText) levelText.textContent = `Lv${player.level}`;

    // Stats
    const attackEl = document.getElementById('hub-attack');
    if (attackEl) attackEl.textContent = `⚔️ ${player.getEffectiveAttack()}`;

    const defenseEl = document.getElementById('hub-defense');
    if (defenseEl) defenseEl.textContent = `🛡️ ${player.getEffectiveDefense()}`;

    const goldEl = document.getElementById('hub-gold');
    if (goldEl) goldEl.textContent = `🪙 ${player.gold}`;

    const floorEl = document.getElementById('hub-floor');
    if (floorEl) floorEl.textContent = `📍 Piso ${floor}`;

    // Mensajes
    this.renderMessages();
  }

  addMessage(text: string): void {
    this.messageLog.push({ text, time: Date.now() });
    if (this.messageLog.length > this.maxMessages) {
      this.messageLog.shift();
    }
    this.renderMessages();
  }

  private renderMessages(): void {
    const container = document.getElementById('hub-messages');
    if (!container) return;

    const recent = this.messageLog.slice(-this.visibleMessages);
    if (recent.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = recent
      .map(m => `<div class="hud-message">${m.text}</div>`)
      .join('');
  }
}
