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

function makeFakeGame(overrides: Partial<Game> = {}): Game {
  return {
    player: new Player(5, 5),
    dungeon: new Dungeon(),
    turn: 0,
    state: "exploring",
    difficulty: "normal",
    addMessage: vi.fn(),
    handleDeath: vi.fn(),
    ...overrides,
  } as unknown as Game;
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

// Regresión: Game.handleDeath() existía pero nada lo llamaba nunca — ni el
// daño de combate ni el de hambre por debajo de 0 hp disparaban la muerte
// (el jugador quedaba "vivo" con 0 hp, jugable indefinidamente). Ver skill
// player-state.
describe("TurnSystem — detección de muerte del jugador", () => {
  it("llama handleDeath() cuando el jugador llega a 0 hp por un ataque enemigo", () => {
    const fakeGame = makeFakeGame();
    fakeGame.player.hp = 1;
    fakeGame.dungeon.enemies = [makeEnemy({
      x: fakeGame.player.x + 1, y: fakeGame.player.y,
      attack: 999, defense: 0, aggroRange: 99, turnsUntilMove: 0,
    })];

    const turnSystem = new TurnSystem(fakeGame);
    turnSystem.executePlayerAction({ type: "wait" });

    expect(fakeGame.player.hp).toBe(0);
    expect(fakeGame.handleDeath).toHaveBeenCalledTimes(1);
  });

  it("llama handleDeath() cuando el hambre en 0 baja el hp a 0", () => {
    const fakeGame = makeFakeGame();
    fakeGame.player.hp = 1;
    fakeGame.player.hunger = 0;
    fakeGame.dungeon.enemies = [];

    const turnSystem = new TurnSystem(fakeGame);
    turnSystem.executePlayerAction({ type: "wait" });

    expect(fakeGame.player.hp).toBe(0);
    expect(fakeGame.handleDeath).toHaveBeenCalledTimes(1);
  });

  it("con hambre en 0, el hp baja de a 1 por turno", () => {
    const fakeGame = makeFakeGame();
    fakeGame.player.hp = 5;
    fakeGame.player.hunger = 0;
    fakeGame.dungeon.enemies = [];
    const turnSystem = new TurnSystem(fakeGame);

    turnSystem.executePlayerAction({ type: "wait" });
    expect(fakeGame.player.hp).toBe(4);

    turnSystem.executePlayerAction({ type: "wait" });
    expect(fakeGame.player.hp).toBe(3);
  });

  it("no llama handleDeath() mientras el jugador tenga hp > 0", () => {
    const fakeGame = makeFakeGame();
    fakeGame.dungeon.enemies = [];

    const turnSystem = new TurnSystem(fakeGame);
    turnSystem.executePlayerAction({ type: "wait" });

    expect(fakeGame.handleDeath).not.toHaveBeenCalled();
  });

  it("no vuelve a llamar handleDeath() si el estado ya es 'dead'", () => {
    const fakeGame = makeFakeGame({ state: "dead" });
    fakeGame.player.hp = 0;
    fakeGame.dungeon.enemies = [];

    const turnSystem = new TurnSystem(fakeGame);
    turnSystem.executePlayerAction({ type: "wait" });

    expect(fakeGame.handleDeath).not.toHaveBeenCalled();
  });

  it("los enemigos restantes no golpean a un jugador ya muerto en la misma ronda", () => {
    const fakeGame = makeFakeGame();
    fakeGame.player.hp = 1;
    const killer = makeEnemy({
      id: "killer", x: fakeGame.player.x + 1, y: fakeGame.player.y,
      attack: 999, defense: 0, aggroRange: 99, turnsUntilMove: 0,
    });
    const bystander = makeEnemy({
      id: "bystander", x: fakeGame.player.x - 1, y: fakeGame.player.y,
      attack: 1, defense: 0, aggroRange: 99, turnsUntilMove: 0,
    });
    fakeGame.dungeon.enemies = [killer, bystander];

    const turnSystem = new TurnSystem(fakeGame);
    turnSystem.executePlayerAction({ type: "wait" });

    expect(fakeGame.player.hp).toBe(0);
    expect(fakeGame.handleDeath).toHaveBeenCalledTimes(1);
    // Solo debe haber un mensaje de ataque (el del killer) — el bystander
    // nunca llega a jugar su turno porque el loop corta al morir el jugador.
    const attackMessages = (fakeGame.addMessage as unknown as ReturnType<typeof vi.fn>).mock.calls
      .filter(([msg]) => typeof msg === "string" && msg.includes("te ataca"));
    expect(attackMessages).toHaveLength(1);
  });
});

// Regeneración pasiva: 1 hp cada 10 turnos, solo mientras el jugador está
// alimentado (hunger > 0). Ver skill player-state.
describe("TurnSystem — regeneración de vida mientras está alimentado", () => {
  function playTurns(turnSystem: TurnSystem, count: number): void {
    for (let i = 0; i < count; i++) {
      turnSystem.executePlayerAction({ type: "wait" });
    }
  }

  it("regenera 1 hp exactamente en el turno 10, no antes", () => {
    const fakeGame = makeFakeGame();
    fakeGame.player.hp = 50;
    fakeGame.player.maxHp = 100;
    fakeGame.player.hunger = 100;
    fakeGame.dungeon.enemies = [];
    const turnSystem = new TurnSystem(fakeGame);

    playTurns(turnSystem, 9);
    expect(fakeGame.player.hp).toBe(50);

    playTurns(turnSystem, 1); // turno 10
    expect(fakeGame.player.hp).toBe(51);
  });

  it("regenera de nuevo en el turno 20 (cada 10 turnos, no una sola vez)", () => {
    const fakeGame = makeFakeGame();
    fakeGame.player.hp = 50;
    fakeGame.player.maxHp = 100;
    fakeGame.player.hunger = 100;
    fakeGame.dungeon.enemies = [];
    const turnSystem = new TurnSystem(fakeGame);

    playTurns(turnSystem, 20);

    expect(fakeGame.player.hp).toBe(52);
    expect(fakeGame.turn).toBe(20);
  });

  it("no regenera mientras el jugador está sin comida (hunger <= 0)", () => {
    const fakeGame = makeFakeGame();
    fakeGame.player.hp = 50;
    fakeGame.player.maxHp = 100;
    fakeGame.player.hunger = 0;
    fakeGame.dungeon.enemies = [];
    const turnSystem = new TurnSystem(fakeGame);

    // Con hambre en 0 el turno 10 debería restar vida (inanición), no sumarla.
    playTurns(turnSystem, 10);

    expect(fakeGame.player.hp).toBe(40);
  });

  it("no supera maxHp al regenerar", () => {
    const fakeGame = makeFakeGame();
    fakeGame.player.hp = fakeGame.player.maxHp;
    fakeGame.player.hunger = 100;
    fakeGame.dungeon.enemies = [];
    const turnSystem = new TurnSystem(fakeGame);

    playTurns(turnSystem, 10);

    expect(fakeGame.player.hp).toBe(fakeGame.player.maxHp);
  });
});
