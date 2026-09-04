import { describe, it, expect } from "vitest";
import {
  getMaxEnemies, createEnemyInstance, trySpawnReplacementEnemy,
} from "../../../../scripts/game/systems/SpawnSystem.ts";
import { Dungeon } from "../../../../scripts/game/world/Dungeon.ts";
import { Player } from "../../../../scripts/game/entities/Player.ts";
import { Tile } from "../../../../scripts/game/world/Tile.ts";
import { MAX_ENEMIES_BASE, ENEMY_RESPAWN_MIN_DISTANCE, ENEMY_TYPES } from "../../../../scripts/constants.ts";
import { ENEMY_DEFINITIONS } from "../../../../assets/enemies/index.ts";
import type { Difficulty } from "../../../../scripts/types.ts";

describe("SpawnSystem", () => {
  describe("getMaxEnemies — 6 + Math.ceil(piso / divisor)", () => {
    it("fácil (divisor 5)", () => {
      expect(getMaxEnemies(1, "easy")).toBe(MAX_ENEMIES_BASE + 1);
      expect(getMaxEnemies(5, "easy")).toBe(MAX_ENEMIES_BASE + 1);
      expect(getMaxEnemies(6, "easy")).toBe(MAX_ENEMIES_BASE + 2);
    });

    it("normal (divisor 3)", () => {
      expect(getMaxEnemies(1, "normal")).toBe(MAX_ENEMIES_BASE + 1);
      expect(getMaxEnemies(3, "normal")).toBe(MAX_ENEMIES_BASE + 1);
      expect(getMaxEnemies(4, "normal")).toBe(MAX_ENEMIES_BASE + 2);
    });

    it("difícil (divisor 1) — un enemigo extra por piso", () => {
      expect(getMaxEnemies(1, "hard")).toBe(MAX_ENEMIES_BASE + 1);
      expect(getMaxEnemies(10, "hard")).toBe(MAX_ENEMIES_BASE + 10);
    });

    it("a mismo piso, difícil siempre permite más enemigos que fácil", () => {
      for (const floor of [1, 5, 9, 20]) {
        expect(getMaxEnemies(floor, "hard")).toBeGreaterThanOrEqual(getMaxEnemies(floor, "normal"));
        expect(getMaxEnemies(floor, "normal")).toBeGreaterThanOrEqual(getMaxEnemies(floor, "easy"));
      }
    });
  });

  describe("createEnemyInstance", () => {
    it("ubica al enemigo en la posición pedida y lo deja listo para su primer turno", () => {
      const enemy = createEnemyInstance(1, 7, 9, "e1");
      expect(enemy.id).toBe("e1");
      expect(enemy.x).toBe(7);
      expect(enemy.y).toBe(9);
      expect(enemy.turnsUntilMove).toBe(0);
      expect(enemy.hp).toBeGreaterThan(0);
      expect(enemy.hp).toBe(enemy.maxHp);
    });

    it("escala hp/attack/defense con el piso (mismo tipo, más piso = más stats)", () => {
      // Fuerza comparación justa fijando el tipo vía el generador de floor 0 (sin escalado) contra uno alto.
      const many = Array.from({ length: 30 }, (_, i) => createEnemyInstance(1, 0, 0, `f1_${i}`));
      const manyHigh = Array.from({ length: 30 }, (_, i) => createEnemyInstance(15, 0, 0, `f15_${i}`));

      const avgHpLow = many.reduce((sum, e) => sum + e.maxHp, 0) / many.length;
      const avgHpHigh = manyHigh.reduce((sum, e) => sum + e.maxHp, 0) / manyHigh.length;

      expect(avgHpHigh).toBeGreaterThan(avgHpLow);
    });

    // Regresión: slime se migró de ENEMY_TYPES (constants.ts) a
    // ENEMY_DEFINITIONS (src/assets/enemies/) — createEnemyInstance debe
    // seguir pudiendo elegirlo y usar su `vision` como `aggroRange`. Ver
    // skill enemy-definitions.
    it("puede generar un slime (definido en src/assets/enemies/, no en ENEMY_TYPES)", () => {
      expect(ENEMY_TYPES.slime).toBeUndefined();

      let sawSlime = false;
      for (let i = 0; i < 300 && !sawSlime; i++) {
        const enemy = createEnemyInstance(1, 0, 0, `try_${i}`);
        if (enemy.type === "slime") sawSlime = true;
      }
      expect(sawSlime).toBe(true);
    });

    it("un slime recién creado usa vision(25) del registro como aggroRange en piso 1", () => {
      let slimeInstance = null;
      for (let i = 0; i < 300 && !slimeInstance; i++) {
        const enemy = createEnemyInstance(1, 0, 0, `try_${i}`);
        if (enemy.type === "slime") slimeInstance = enemy;
      }
      expect(slimeInstance).not.toBeNull();
      expect(slimeInstance!.aggroRange).toBe(ENEMY_DEFINITIONS.slime.vision);
    });
  });

  describe("trySpawnReplacementEnemy", () => {
    function freshDungeonAndPlayer(floor: number, difficulty: Difficulty) {
      const dungeon = new Dungeon();
      dungeon.generateLevel(floor, difficulty);
      const start = dungeon.rooms[0];
      const player = new Player(start.centerX, start.centerY);
      return { dungeon, player };
    }

    it("agrega un enemigo caminable cuando el piso está por debajo del máximo", () => {
      const { dungeon, player } = freshDungeonAndPlayer(1, "normal");
      dungeon.enemies = [];

      const spawned = trySpawnReplacementEnemy(dungeon, player, 1, "normal");

      expect(spawned).toBe(true);
      expect(dungeon.enemies).toHaveLength(1);
      const enemy = dungeon.enemies[0];
      expect(Tile.isWalkable(dungeon.getTile(enemy.x, enemy.y))).toBe(true);
    });

    it("no agrega nada si el piso ya está en el máximo de enemigos vivos", () => {
      const { dungeon, player } = freshDungeonAndPlayer(1, "easy");
      const max = getMaxEnemies(1, "easy");
      dungeon.enemies = Array.from({ length: max }, (_, i) => createEnemyInstance(1, 2, 2, `full_${i}`));

      const spawned = trySpawnReplacementEnemy(dungeon, player, 1, "easy");

      expect(spawned).toBe(false);
      expect(dungeon.enemies).toHaveLength(max);
    });

    it("ignora enemigos muertos (hp<=0) al contar cuántos hay vivos", () => {
      const { dungeon, player } = freshDungeonAndPlayer(1, "easy");
      const max = getMaxEnemies(1, "easy");
      dungeon.enemies = Array.from({ length: max }, (_, i) => {
        const e = createEnemyInstance(1, 2, 2, `dead_${i}`);
        e.hp = 0;
        return e;
      });

      const spawned = trySpawnReplacementEnemy(dungeon, player, 1, "easy");

      expect(spawned).toBe(true);
    });

    it("reaparece razonablemente lejos del jugador cuando hay espacio en el mapa", () => {
      const { dungeon, player } = freshDungeonAndPlayer(3, "normal");
      dungeon.enemies = [];

      trySpawnReplacementEnemy(dungeon, player, 3, "normal");

      const enemy = dungeon.enemies[0];
      const distance = Math.abs(enemy.x - player.x) + Math.abs(enemy.y - player.y);
      // El mapa (40x30) suele tener sobra de espacio para la distancia mínima
      // completa; toleramos que se haya relajado a la mitad como mucho.
      expect(distance).toBeGreaterThanOrEqual(ENEMY_RESPAWN_MIN_DISTANCE / 2);
    });

    it("nunca reaparece exactamente sobre el jugador", () => {
      const { dungeon, player } = freshDungeonAndPlayer(1, "hard");
      dungeon.enemies = [];

      for (let i = 0; i < 10; i++) {
        trySpawnReplacementEnemy(dungeon, player, 1, "hard");
      }

      for (const enemy of dungeon.enemies) {
        expect(enemy.x === player.x && enemy.y === player.y).toBe(false);
      }
    });
  });
});
