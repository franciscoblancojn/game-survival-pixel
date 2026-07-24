import { Hub } from './Hub.js';
import type { Player } from '../game/entities/Player.js';

/**
 * HUD — High-level UI facade for the heads-up display.
 *
 * Delegates state→DOM synchronization to the Hub instance.
 * This keeps the Hub pattern clean: Hub handles the actual DOM updates,
 * HUD provides the game-facing API.
 */
export class HUD {
  private hub: Hub;

  constructor() {
    this.hub = new Hub();
  }

  render(player: Player, floor: number): void {
    this.hub.syncPlayerState(player, floor);
  }

  addMessage(text: string): void {
    this.hub.addMessage(text);
  }
}
