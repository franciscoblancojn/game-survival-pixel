import { describe, it, expect, beforeEach } from "vitest";
import { Game } from "../../../scripts/game/Game.ts";

/**
 * Integración de punta a punta: caminar sobre una escalera (TurnSystem)
 * dispara la transición de piso real en Game (antes esto era código muerto
 * — Game.goDownStairs() existía pero nadie lo llamaba, ver skill
 * npc-trading), subir desde el piso 1 lleva al mercado, y caminar hacia un
 * NPC abre el comercio sin gastar turno.
 *
 * Usa un canvas/contexto 2D falsos (un Proxy que no-opea cualquier método
 * de dibujo) para poder instanciar el Game real completo sin un navegador —
 * Renderer solo necesita que `getContext('2d')` devuelva algo con las
 * llamadas que hace, nunca se verifica lo que dibuja.
 */
function makeFakeCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const fakeCtx = new Proxy(
    {},
    {
      get: (target: any, prop) => (prop in target ? target[prop] : (() => undefined)),
      set: (target: any, prop, value) => {
        target[prop] = value;
        return true;
      },
    }
  );
  canvas.getContext = (() => fakeCtx) as unknown as typeof canvas.getContext;
  return canvas;
}

/** Teletransporta al jugador justo al lado de `pos` y da un paso hacia ahí — evita depender del pathfinding de pasillos reales para probar la transición. */
function stepOnto(game: Game, pos: { x: number; y: number }): void {
  game.player.x = pos.x - 1;
  game.player.y = pos.y;
  game.turnSystem.executePlayerAction({ type: "move", dx: 1, dy: 0 });
}

describe("Escaleras + mercado — integración de punta a punta", () => {
  let game: Game;

  beforeEach(() => {
    game = new Game(makeFakeCanvas());
    // Normalmente lo crea Game.init() (no llamado acá, no hace falta un
    // menú principal real para esta prueba) — startNewGame() lo usa para
    // cerrar el menú al arrancar la partida.
    game.mainMenu = { close: () => undefined, open: () => undefined } as unknown as Game["mainMenu"];
    game.startNewGame(1);
    // Sin enemigos/items de por medio: la sala inicial de un seed al azar
    // podría spawnear algo justo en la celda adyacente a la escalera que
    // stepOnto() usa para el paso final.
    game.dungeon.enemies = [];
    game.dungeon.items = [];
  });

  it("bajar las escaleras genera el siguiente piso y aparece en su escalera de subida", () => {
    const down = game.dungeon.stairsDownPos!;
    stepOnto(game, down);

    expect(game.dungeon.floor).toBe(2);
    expect(game.player.x).toBe(game.dungeon.stairsUpPos!.x);
    expect(game.player.y).toBe(game.dungeon.stairsUpPos!.y);
  });

  it("subir las escaleras desde el piso 2 vuelve al piso 1 de antes (restaurado, no regenerado)", () => {
    const grid1 = game.dungeon.grid;
    stepOnto(game, game.dungeon.stairsDownPos!); // 1 -> 2
    game.dungeon.enemies = [];
    game.dungeon.items = [];

    const up2 = game.dungeon.stairsUpPos!;
    game.player.x = up2.x;
    game.player.y = up2.y - 1;
    game.turnSystem.executePlayerAction({ type: "move", dx: 0, dy: 1 });

    expect(game.dungeon.floor).toBe(1);
    expect(game.player.x).toBe(game.dungeon.stairsDownPos!.x);
    expect(game.player.y).toBe(game.dungeon.stairsDownPos!.y);
    // Es literalmente el mismo grid de antes de bajar, no uno regenerado.
    expect(game.dungeon.grid).toBe(grid1);
  });

  it("subir desde el piso 1 lleva al mercado (piso 0), no a un piso 0 procedural", () => {
    const up1 = game.dungeon.stairsUpPos!;
    game.player.x = up1.x - 1;
    game.player.y = up1.y;
    game.turnSystem.executePlayerAction({ type: "move", dx: 1, dy: 0 });

    expect(game.dungeon.floor).toBe(0);
    expect(game.dungeon.stairsUpPos).toBeNull();
    expect(game.dungeon.npcs.length).toBeGreaterThanOrEqual(3);
  });

  it("caminar hacia un NPC abre el comercio sin gastar turno ni mover al jugador sobre su celda", () => {
    stepOnto(game, game.dungeon.stairsUpPos!); // 1 -> mercado (piso 0)

    const npc = game.dungeon.npcs[0];
    const turnBefore = game.turn;
    game.player.x = npc.x - 1;
    game.player.y = npc.y;

    game.turnSystem.executePlayerAction({ type: "move", dx: 1, dy: 0 });

    expect(game.state).toBe("trading");
    expect(game.marketUI.visible).toBe(true);
    expect(game.marketUI.activeNpc?.type).toBe(npc.type);
    expect(game.player.x).toBe(npc.x - 1); // no se movió encima del NPC
    expect(game.turn).toBe(turnBefore); // hablar no consume turno

    game.closeTrade();
    expect(game.state).toBe("exploring");
    expect(game.marketUI.visible).toBe(false);
  });

  it("bajar desde el mercado vuelve al piso 1 de antes (restaurado, no regenerado)", () => {
    const grid1 = game.dungeon.grid;
    stepOnto(game, game.dungeon.stairsUpPos!); // 1 -> mercado

    const down0 = game.dungeon.stairsDownPos!;
    game.player.x = down0.x - 1;
    game.player.y = down0.y;
    game.turnSystem.executePlayerAction({ type: "move", dx: 1, dy: 0 });

    expect(game.dungeon.floor).toBe(1);
    expect(game.dungeon.grid).toBe(grid1);
  });
});

describe("Dungeon.floorCache — el piso que se abandona vuelve exactamente como quedó", () => {
  let game: Game;

  beforeEach(() => {
    game = new Game(makeFakeCanvas());
    game.mainMenu = { close: () => undefined, open: () => undefined } as unknown as Game["mainMenu"];
    game.startNewGame(1);
  });

  it("un enemigo matado en el piso 1 sigue muerto al volver, tras bajar y subir", () => {
    game.dungeon.items = [];
    const survivor = { id: "e_survivor", type: "rat", name: "Rata", x: 2, y: 2, hp: 10, maxHp: 10, attack: 1, defense: 0, xp: 1, aggroRange: 1, color: "#fff", darkColor: "#000", speed: 1, turnsUntilMove: 0 };
    game.dungeon.enemies = [survivor];

    // "Matar" al enemigo antes de dejar el piso — mismo efecto que
    // TurnSystem.playerAttack cuando hp llega a 0.
    game.dungeon.removeEnemy(survivor);
    expect(game.dungeon.enemies).toHaveLength(0);

    stepOnto(game, game.dungeon.stairsDownPos!); // 1 -> 2
    game.dungeon.enemies = [];
    game.dungeon.items = [];
    stepOnto(game, game.dungeon.stairsUpPos!); // 2 -> 1 (restaurado)

    expect(game.dungeon.floor).toBe(1);
    expect(game.dungeon.enemies).toHaveLength(0);
  });

  it("un item recogido en el piso 1 no reaparece al volver, tras subir al mercado y bajar", () => {
    game.dungeon.enemies = [];
    const picked = { id: "i_picked", type: "wood", name: "Madera", x: 2, y: 2, quantity: 1, stackable: true, icon: "🪵", color: "#8b4513" };
    game.dungeon.items = [picked];

    game.dungeon.removeItem(picked);
    expect(game.dungeon.items).toHaveLength(0);

    stepOnto(game, game.dungeon.stairsUpPos!); // 1 -> mercado
    stepOnto(game, game.dungeon.stairsDownPos!); // mercado -> 1 (restaurado)

    expect(game.dungeon.floor).toBe(1);
    expect(game.dungeon.items).toHaveLength(0);
  });

  it("guardar y cargar la ranura conserva el piso cacheado (no solo el activo)", () => {
    game.currentSlot = 1;
    game.dungeon.enemies = [];
    game.dungeon.items = [];
    const roomCountFloor1 = game.dungeon.rooms.length;

    stepOnto(game, game.dungeon.stairsDownPos!); // 1 -> 2 (cachea el piso 1)
    expect(game.dungeon.floorCache.has(1)).toBe(true);

    game.saveGame();

    const reloaded = new Game(makeFakeCanvas());
    reloaded.mainMenu = { close: () => undefined, open: () => undefined } as unknown as Game["mainMenu"];
    expect(reloaded.continueGame(1)).toBe(true);

    expect(reloaded.dungeon.floorCache.has(1)).toBe(true);
    expect(reloaded.dungeon.floorCache.get(1)!.rooms).toHaveLength(roomCountFloor1);

    reloaded.dungeon.enemies = [];
    reloaded.dungeon.items = [];
    stepOnto(reloaded, reloaded.dungeon.stairsUpPos!); // 2 -> 1 (restaurado desde el guardado)

    expect(reloaded.dungeon.floor).toBe(1);
    expect(reloaded.dungeon.rooms).toHaveLength(roomCountFloor1);
  });
});
