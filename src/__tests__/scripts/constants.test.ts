import { describe, it, expect } from "vitest";
import {
  TILE,
  CELL_SIZE,
  MAP_WIDTH,
  MAP_HEIGHT,
  GAME_NAME,
  STORAGE_KEY,
  PLAYER_DEFAULTS,
  COLORS,
  ITEM_TYPES,
} from "../../scripts/constants.ts";
import { ENEMY_DEFINITIONS } from "../../assets/enemies/index.ts";

describe("constants", () => {
  describe("TILE", () => {
    it("should have all tile types", () => {
      expect(TILE.VOID).toBe(0);
      expect(TILE.FLOOR).toBe(1);
      expect(TILE.WALL).toBe(2);
      expect(TILE.DOOR).toBe(3);
      expect(TILE.CORRIDOR).toBe(4);
      expect(TILE.STAIRS_DOWN).toBe(5);
      expect(TILE.STAIRS_UP).toBe(6);
    });

    it("should have 7 tile types", () => {
      expect(Object.keys(TILE)).toHaveLength(7);
    });
  });

  describe("grid", () => {
    it("should have standard cell size", () => {
      expect(CELL_SIZE).toBe(32);
    });

    it("should have valid map dimensions", () => {
      expect(MAP_WIDTH).toBeGreaterThan(0);
      expect(MAP_HEIGHT).toBeGreaterThan(0);
    });
  });

  describe("game metadata", () => {
    it("should have correct game name", () => {
      expect(GAME_NAME).toBe("Mazmorra");
    });

    it("should have a storage key", () => {
      expect(STORAGE_KEY).toBeTruthy();
    });
  });

  describe("PLAYER_DEFAULTS", () => {
    it("should have all required stats", () => {
      expect(PLAYER_DEFAULTS.hp).toBe(100);
      expect(PLAYER_DEFAULTS.maxHp).toBe(100);
      expect(PLAYER_DEFAULTS.attack).toBe(5);
      expect(PLAYER_DEFAULTS.defense).toBe(2);
    });

    it("should start at level 1 with 0 XP", () => {
      expect(PLAYER_DEFAULTS.level).toBe(1);
      expect(PLAYER_DEFAULTS.xp).toBe(0);
      expect(PLAYER_DEFAULTS.xpToLevel).toBe(20);
    });
  });

  describe("COLORS", () => {
    it("should have all required color keys", () => {
      const requiredKeys = [
        "background", "floor", "wall", "door",
        "player", "enemy", "item", "hpBar",
        "hungerBar", "xpBar",
      ];
      for (const key of requiredKeys) {
        expect(COLORS).toHaveProperty(key);
      }
    });

    it("should be hex colors", () => {
      const hexRegex = /^#[0-9a-f]{6}$/i;
      for (const value of Object.values(COLORS)) {
        // rgba values are also valid
        if (typeof value === "string" && value.startsWith("rgba")) continue;
        expect(value).toMatch(hexRegex);
      }
    });
  });

  // Todos los tipos de enemigo (rat, skeleton, slime) viven hoy en
  // ENEMY_DEFINITIONS (src/assets/enemies/) — el viejo ENEMY_TYPES plano de
  // constants.ts se retiró al terminar la migración. Ver skill
  // enemy-definitions.
  describe("ENEMY_DEFINITIONS (src/assets/enemies/)", () => {
    it("should have at least 3 enemy types", () => {
      expect(Object.keys(ENEMY_DEFINITIONS).length).toBeGreaterThanOrEqual(3);
    });

    it("should have rat with correct stats", () => {
      expect(ENEMY_DEFINITIONS.rat.name).toBe("Rata");
      expect(ENEMY_DEFINITIONS.rat.hp).toBe(15);
      expect(ENEMY_DEFINITIONS.rat.attack).toBe(3);
    });

    it("should have skeleton with higher stats than rat", () => {
      expect(ENEMY_DEFINITIONS.skeleton.hp).toBeGreaterThan(ENEMY_DEFINITIONS.rat.hp);
      expect(ENEMY_DEFINITIONS.skeleton.attack).toBeGreaterThan(ENEMY_DEFINITIONS.rat.attack);
    });

    it("cada enemigo tiene loot y oro definidos (aunque loot pueda ser una lista vacía)", () => {
      for (const def of Object.values(ENEMY_DEFINITIONS)) {
        expect(Array.isArray(def.loot)).toBe(true);
        expect(def.gold.min).toBeGreaterThanOrEqual(0);
        expect(def.gold.max).toBeGreaterThanOrEqual(def.gold.min);
      }
    });
  });

  describe("ITEM_TYPES", () => {
    it("should have weapons", () => {
      expect(ITEM_TYPES.rusty_sword.type).toBe("weapon");
      expect(ITEM_TYPES.rusty_sword.attack).toBe(3);
    });

    it("should have consumables", () => {
      expect(ITEM_TYPES.health_potion.type).toBe("consumable");
      expect(ITEM_TYPES.health_potion.heal).toBe(30);
    });

    it("should have materials", () => {
      expect(ITEM_TYPES.wood.type).toBe("material");
      expect(ITEM_TYPES.wood.stackable).toBe(true);
    });

    it("each item should have an icon", () => {
      for (const [key, item] of Object.entries(ITEM_TYPES)) {
        expect(item.icon, `Item ${key} missing icon`).toBeTruthy();
      }
    });
  });
});
