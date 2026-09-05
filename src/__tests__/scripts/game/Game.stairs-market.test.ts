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

  it("subir las escaleras desde el piso 2 regresa a un piso 1 (nuevo)", () => {
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

  it("bajar desde el mercado regresa a un piso 1 (nuevo)", () => {
    stepOnto(game, game.dungeon.stairsUpPos!); // 1 -> mercado

    const down0 = game.dungeon.stairsDownPos!;
    game.player.x = down0.x - 1;
    game.player.y = down0.y;
    game.turnSystem.executePlayerAction({ type: "move", dx: 1, dy: 0 });

    expect(game.dungeon.floor).toBe(1);
  });
});
