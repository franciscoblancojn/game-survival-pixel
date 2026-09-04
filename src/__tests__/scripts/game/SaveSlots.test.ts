import { describe, it, expect, beforeEach } from "vitest";
import {
  loadSlot, saveSlot, deleteSlot, listSlots, firstFreeSlot, migrateLegacySave,
} from "../../../scripts/game/SaveSlots.ts";
import { STORAGE_KEY, STORAGE_VERSION, SAVE_SLOT_COUNT } from "../../../scripts/constants.ts";
import type { GameSaveData } from "../../../scripts/types.ts";

function makeSaveData(overrides: Partial<GameSaveData> = {}): GameSaveData {
  return {
    version: STORAGE_VERSION,
    savedAt: Date.now(),
    difficulty: 'normal',
    player: {
      x: 5, y: 5, hp: 100, maxHp: 100, hunger: 100, maxHunger: 100,
      attack: 5, defense: 2, level: 1, xp: 0, xpToLevel: 20,
      inventory: [], equipment: { weapon: null, armor: null },
    },
    dungeon: { floor: 1, grid: [], rooms: [], enemies: [], items: [] },
    stats: { turn: 0, enemiesKilled: 0, deepestFloor: 1 },
    ...overrides,
  };
}

describe("SaveSlots", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("listSlots devuelve las 5 ranuras vacías cuando no hay nada guardado", () => {
    const slots = listSlots();
    expect(slots).toHaveLength(SAVE_SLOT_COUNT);
    expect(slots.every(s => s.empty)).toBe(true);
  });

  it("saveSlot/loadSlot hacen round-trip de los datos", () => {
    const data = makeSaveData({ dungeon: { floor: 3, grid: [], rooms: [], enemies: [], items: [] } });
    saveSlot(2, data);

    const loaded = loadSlot(2);
    expect(loaded?.dungeon.floor).toBe(3);
    expect(loaded?.player.x).toBe(5);
  });

  it("listSlots refleja las ranuras ocupadas con su resumen", () => {
    saveSlot(1, makeSaveData({
      dungeon: { floor: 4, grid: [], rooms: [], enemies: [], items: [] },
      player: { ...makeSaveData().player, level: 7 },
      stats: { turn: 42, enemiesKilled: 3, deepestFloor: 4 },
    }));

    const slots = listSlots();
    const slot1 = slots.find(s => s.id === 1)!;
    expect(slot1.empty).toBe(false);
    expect(slot1.floor).toBe(4);
    expect(slot1.playerLevel).toBe(7);
    expect(slot1.turn).toBe(42);

    expect(slots.find(s => s.id === 2)!.empty).toBe(true);
  });

  it("deleteSlot vacía la ranura", () => {
    saveSlot(4, makeSaveData());
    expect(listSlots().find(s => s.id === 4)!.empty).toBe(false);

    deleteSlot(4);
    expect(listSlots().find(s => s.id === 4)!.empty).toBe(true);
  });

  it("firstFreeSlot devuelve la primera ranura vacía o null si todas están ocupadas", () => {
    expect(firstFreeSlot(listSlots())).toBe(1);

    for (let i = 1; i <= SAVE_SLOT_COUNT; i++) saveSlot(i, makeSaveData());
    expect(firstFreeSlot(listSlots())).toBeNull();
  });

  it("ignora versiones de guardado antiguas/incompatibles (ranura vacía)", () => {
    localStorage.setItem(`${STORAGE_KEY}_slot_1`, JSON.stringify({ ...makeSaveData(), version: 999 }));
    expect(loadSlot(1)).toBeNull();
    expect(listSlots().find(s => s.id === 1)!.empty).toBe(true);
  });

  describe("migrateLegacySave", () => {
    it("mueve la key vieja (sin ranura) a la primera ranura libre y la borra", () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(makeSaveData({
        dungeon: { floor: 2, grid: [], rooms: [], enemies: [], items: [] },
      })));

      migrateLegacySave();

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      const slot1 = loadSlot(1);
      expect(slot1?.dungeon.floor).toBe(2);
    });

    it("no hace nada si no existe la key vieja", () => {
      migrateLegacySave();
      expect(listSlots().every(s => s.empty)).toBe(true);
    });

    it("descarta la key vieja si todas las ranuras ya están ocupadas", () => {
      for (let i = 1; i <= SAVE_SLOT_COUNT; i++) saveSlot(i, makeSaveData());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(makeSaveData()));

      migrateLegacySave();

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(listSlots().every(s => !s.empty)).toBe(true);
    });

    it("descarta una key vieja corrupta sin lanzar excepción", () => {
      localStorage.setItem(STORAGE_KEY, "{not valid json");
      expect(() => migrateLegacySave()).not.toThrow();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });
});
