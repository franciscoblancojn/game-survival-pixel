import { describe, it, expect, vi } from "vitest";
import { calculateDamage, damageEnemy, executeEnemyTurn } from "../../../../scripts/game/systems/CombatSystem.ts";
import { TurnSystem } from "../../../../scripts/game/systems/TurnSystem.ts";
import { Dungeon } from "../../../../scripts/game/world/Dungeon.ts";
import { Player } from "../../../../scripts/game/entities/Player.ts";
import { TILE } from "../../../../scripts/constants.ts";
import type { EnemyInstance } from "../../../../scripts/types.ts";
import type { Game } from "../../../../scripts/game/Game.ts";

// Los enemigos son objetos planos (EnemyInstance), no instancias de Entity —
// no tienen isAlive()/takeDamage()/manhattanDistanceTo(). Estos fixtures
// reproducen exactamente la forma en la que Dungeon.ts los crea.
function makeEnemy(overrides: Partial<EnemyInstance> = {}): EnemyInstance {
  return {
    id: "enemy_test",
    type: "rat",
    name: "Rata",
    x: 5,
    y: 5,
    hp: 10,
    maxHp: 10,
    attack: 3,
    defense: 1,
    xp: 5,
    aggroRange: 5,
    color: "#fff",
    darkColor: "#000",
    speed: 1,
    turnsUntilMove: 0,
    ...overrides,
  };
}

describe("CombatSystem", () => {
  describe("damageEnemy", () => {
    it("aplica el monto recibido tal cual (ya viene neto de defensa desde calculateDamage)", () => {
      const enemy = makeEnemy({ hp: 10, defense: 2 });
      const actual = damageEnemy(enemy, 5);
      expect(actual).toBe(5);
      expect(enemy.hp).toBe(5);
    });

    it("no baja el hp de 0", () => {
      const enemy = makeEnemy({ hp: 2, defense: 0 });
      damageEnemy(enemy, 100);
      expect(enemy.hp).toBe(0);
    });
  });

  describe("executeEnemyTurn — con enemigos como datos planos", () => {
    it("no lanza excepción y ataca si está adyacente al jugador", () => {
      const enemy = makeEnemy({ x: 5, y: 5 });
      const player = new Player(6, 5);
      const dungeon = new Dungeon();

      const result = executeEnemyTurn(enemy, player, dungeon);

      expect(result?.type).toBe("attack");
      expect(player.hp).toBeLessThan(player.maxHp);
    });

    it("no lanza excepción al moverse hacia el jugador", () => {
      const enemy = makeEnemy({ x: 5, y: 5, aggroRange: 10 });
      const player = new Player(8, 5);
      const dungeon = new Dungeon();
      dungeon.grid[5] = dungeon.grid[5].map(() => TILE.FLOOR);

      expect(() => executeEnemyTurn(enemy, player, dungeon)).not.toThrow();
    });
  });
});

describe("TurnSystem — regresión: movimiento no debe romperse con enemigos vivos", () => {
  it("executePlayerAction no lanza excepción y avanza el turno con un enemigo en el piso", () => {
    const dungeon = new Dungeon();
    dungeon.generateTestRoom(); // crea enemigos como objetos planos, igual que en el juego real
    const room = dungeon.rooms[0];
    const player = new Player(room.centerX, room.centerY);

    const fakeGame = {
      player,
      dungeon,
      turn: 0,
      addMessage: vi.fn(),
    } as unknown as Game;

    const turnSystem = new TurnSystem(fakeGame);

    expect(() => turnSystem.executePlayerAction({ type: "wait" })).not.toThrow();
    expect(fakeGame.turn).toBe(1);
  });

  it("mover al jugador a una celda caminable actualiza su posición sin lanzar excepción", () => {
    const dungeon = new Dungeon();
    dungeon.generateTestRoom();
    const room = dungeon.rooms[0];
    const player = new Player(room.centerX, room.centerY);

    const fakeGame = {
      player,
      dungeon,
      turn: 0,
      addMessage: vi.fn(),
    } as unknown as Game;

    const turnSystem = new TurnSystem(fakeGame);
    const startX = player.x;
    const startY = player.y;

    // Las salas de prueba colocan muros internos aleatorios: buscamos una
    // dirección adyacente garantizada caminable en vez de asumir dx=1.
    const dirs = [
      { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
    ];
    const dir = dirs.find(d => player.canMoveTo(startX + d.dx, startY + d.dy, dungeon))!;
    expect(dir).toBeDefined();

    expect(() => turnSystem.executePlayerAction({ type: "move", dx: dir.dx, dy: dir.dy })).not.toThrow();
    expect(player.x).toBe(startX + dir.dx);
    expect(player.y).toBe(startY + dir.dy);
    expect(fakeGame.turn).toBe(1);
  });
});
