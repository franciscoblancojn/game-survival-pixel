import { STORAGE_KEY, STORAGE_VERSION, SAVE_SLOT_COUNT, DEFAULT_DIFFICULTY } from '../constants.js';
import type { GameSaveData, SlotSummary } from '../types.js';

function slotKey(id: number): string {
  return `${STORAGE_KEY}_slot_${id}`;
}

export function loadSlot(id: number): GameSaveData | null {
  try {
    const raw = localStorage.getItem(slotKey(id));
    if (!raw) return null;
    const data = JSON.parse(raw) as GameSaveData;
    if (data.version !== STORAGE_VERSION) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveSlot(id: number, data: GameSaveData): void {
  try {
    localStorage.setItem(slotKey(id), JSON.stringify(data));
  } catch (e) {
    console.warn('No se pudo guardar la partida:', e);
  }
}

export function deleteSlot(id: number): void {
  localStorage.removeItem(slotKey(id));
}

export function listSlots(): SlotSummary[] {
  const slots: SlotSummary[] = [];
  for (let id = 1; id <= SAVE_SLOT_COUNT; id++) {
    const data = loadSlot(id);
    if (!data) {
      slots.push({ id, empty: true });
    } else {
      slots.push({
        id,
        empty: false,
        floor: data.dungeon.floor,
        playerLevel: data.player.level,
        turn: data.stats.turn,
        savedAt: data.savedAt,
        difficulty: data.difficulty ?? DEFAULT_DIFFICULTY,
      });
    }
  }
  return slots;
}

export function firstFreeSlot(slots: SlotSummary[]): number | null {
  const found = slots.find(s => s.empty);
  return found ? found.id : null;
}

/**
 * Antes de que existieran las 5 ranuras, el juego guardaba una única
 * partida bajo STORAGE_KEY a secas. Si esa key vieja sigue presente, la
 * movemos a la primera ranura libre para no perder progreso, y la borramos.
 * Es justo la causa de que "el mapa siempre fuera el mismo": esa única
 * partida se recargaba en cada visita sin forma de empezar una nueva.
 */
export function migrateLegacySave(): void {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return;
  }
  if (!raw) return;

  try {
    const data = JSON.parse(raw) as GameSaveData;
    if (data.version === STORAGE_VERSION) {
      const free = firstFreeSlot(listSlots());
      if (free !== null) {
        if (!data.savedAt) data.savedAt = Date.now();
        if (!data.difficulty) data.difficulty = DEFAULT_DIFFICULTY;
        saveSlot(free, data);
      }
    }
  } catch {
    // partida vieja corrupta: la descartamos junto con la key
  }

  localStorage.removeItem(STORAGE_KEY);
}
