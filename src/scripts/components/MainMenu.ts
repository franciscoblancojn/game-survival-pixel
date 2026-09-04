import type { Game } from '../game/Game.js';
import { listSlots, deleteSlot } from '../game/SaveSlots.js';
import { DIFFICULTY_SETTINGS } from '../constants.js';
import type { SlotSummary, Difficulty } from '../types.js';
import { showConfirm } from './ConfirmDialog.js';

type Mode = 'new' | 'continue';

const DIFFICULTY_DESCRIPTIONS: Record<Difficulty, string> = {
  easy: 'Menos enemigos por piso',
  normal: 'Cantidad de enemigos equilibrada',
  hard: 'Muchos más enemigos por piso',
};

/**
 * Pantalla de inicio: Nueva partida / Continuar, con 5 ranuras de guardado.
 * - "Continuar" solo permite elegir una ranura ocupada.
 * - "Nueva partida" sobre una ranura vacía pasa directo a elegir dificultad;
 *   sobre una ranura ocupada pide confirmación para borrarla primero.
 */
export class MainMenu {
  private game: Game;
  private mode: Mode = 'new';
  private pendingNewGameSlot: number | null = null;

  constructor(game: Game) {
    this.game = game;
    this.bindStaticButtons();
  }

  open(): void {
    const overlay = document.getElementById('mainmenu-overlay');
    if (overlay) overlay.style.display = 'flex';
    this.showRoot();
  }

  close(): void {
    const overlay = document.getElementById('mainmenu-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  private bindStaticButtons(): void {
    document.getElementById('mainmenu-new')?.addEventListener('click', () => {
      this.mode = 'new';
      this.showSlots();
    });
    document.getElementById('mainmenu-continue')?.addEventListener('click', () => {
      this.mode = 'continue';
      this.showSlots();
    });
    document.getElementById('mainmenu-back')?.addEventListener('click', () => this.showRoot());
    document.getElementById('mainmenu-difficulty-back')?.addEventListener('click', () => this.showSlots());
  }

  private showScreen(id: 'mainmenu-root' | 'mainmenu-slots' | 'mainmenu-difficulty'): void {
    for (const screenId of ['mainmenu-root', 'mainmenu-slots', 'mainmenu-difficulty'] as const) {
      const el = document.getElementById(screenId);
      if (el) el.style.display = screenId === id ? 'flex' : 'none';
    }
  }

  private showRoot(): void {
    this.showScreen('mainmenu-root');
  }

  private showSlots(): void {
    this.showScreen('mainmenu-slots');

    const title = document.getElementById('mainmenu-slots-title');
    if (title) {
      title.textContent = this.mode === 'new'
        ? 'Elige una ranura para tu nueva partida'
        : 'Elige una partida guardada';
    }

    this.renderSlots();
  }

  /** Última pregunta antes de generar la mazmorra: qué tan difícil va a ser. */
  private showDifficulty(slot: number): void {
    this.pendingNewGameSlot = slot;
    this.showScreen('mainmenu-difficulty');

    const list = document.getElementById('mainmenu-difficulty-list');
    if (!list) return;

    list.innerHTML = (Object.keys(DIFFICULTY_SETTINGS) as Difficulty[])
      .map(difficulty => `
        <button class="slot-card difficulty-card" data-difficulty="${difficulty}">
          <span class="slot-number">${DIFFICULTY_SETTINGS[difficulty].label}</span>
          <span class="slot-info">${DIFFICULTY_DESCRIPTIONS[difficulty]}</span>
        </button>
      `)
      .join('');

    list.querySelectorAll<HTMLButtonElement>('.difficulty-card').forEach(card => {
      const difficulty = card.dataset.difficulty as Difficulty;
      card.addEventListener('click', () => this.onDifficultyClick(difficulty));
    });
  }

  private onDifficultyClick(difficulty: Difficulty): void {
    if (this.pendingNewGameSlot === null) return;
    this.game.startNewGame(this.pendingNewGameSlot, difficulty);
    this.pendingNewGameSlot = null;
  }

  private renderSlots(): void {
    const list = document.getElementById('mainmenu-slots-list');
    if (!list) return;

    const slots = listSlots();
    list.innerHTML = slots.map(s => this.slotHtml(s)).join('');

    list.querySelectorAll<HTMLButtonElement>('.slot-card').forEach(card => {
      const id = Number(card.dataset.slot);
      const slot = slots.find(s => s.id === id);
      if (!slot) return;
      card.addEventListener('click', () => this.onSlotClick(slot));
    });
  }

  private slotHtml(slot: SlotSummary): string {
    if (slot.empty) {
      const disabled = this.mode === 'continue' ? 'disabled' : '';
      return `
        <button class="slot-card empty" data-slot="${slot.id}" ${disabled}>
          <span class="slot-number">Ranura ${slot.id}</span>
          <span class="slot-status">Vacío</span>
        </button>
      `;
    }

    const date = slot.savedAt ? new Date(slot.savedAt).toLocaleString() : '';
    const difficultyLabel = slot.difficulty ? DIFFICULTY_SETTINGS[slot.difficulty].label : '';
    return `
      <button class="slot-card filled" data-slot="${slot.id}">
        <span class="slot-number">Ranura ${slot.id}</span>
        <span class="slot-info">Piso ${slot.floor} · Nv.${slot.playerLevel} · Turno ${slot.turn} · ${difficultyLabel}</span>
        <span class="slot-date">${date}</span>
        ${this.mode === 'new' ? '<span class="slot-hint">Toca para eliminar y empezar aquí</span>' : ''}
      </button>
    `;
  }

  private async onSlotClick(slot: SlotSummary): Promise<void> {
    if (this.mode === 'continue') {
      if (slot.empty) return;
      this.game.continueGame(slot.id);
      return;
    }

    if (slot.empty) {
      this.showDifficulty(slot.id);
      return;
    }

    const ok = await showConfirm(
      `La ranura ${slot.id} tiene una partida (Piso ${slot.floor}, Nv.${slot.playerLevel}). ¿Eliminarla y empezar una nueva?`
    );
    if (!ok) return;

    deleteSlot(slot.id);
    this.showDifficulty(slot.id);
  }
}
