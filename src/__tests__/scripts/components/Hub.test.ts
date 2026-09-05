import { describe, it, expect, beforeEach } from "vitest";
import { Hub } from "../../../scripts/components/Hub.ts";
import { Player } from "../../../scripts/game/entities/Player.ts";

// El HUD real (src/components/Hub/index.astro) — replicamos solo los IDs
// que Hub.ts (scripts/components) toca vía syncPlayerState/addMessage.
function mountHudDom(): void {
  document.body.innerHTML = `
    <div id="hud">
      <div id="hub-hp-bar"></div>
      <span id="hub-hp-text"></span>
      <div id="hub-hunger-bar"></div>
      <span id="hub-hunger-text"></span>
      <div id="hub-xp-bar"></div>
      <span id="hub-level-text"></span>
      <span id="hub-attack"></span>
      <span id="hub-defense"></span>
      <span id="hub-gold"></span>
      <span id="hub-floor"></span>
      <div id="hub-messages"></div>
    </div>
  `;
}

describe("Hub (scripts/components/Hub.ts) — sincronización HUD <-> DOM", () => {
  beforeEach(() => {
    mountHudDom();
  });

  it("syncPlayerState actualiza hp/hunger/xp/nivel/ataque/defensa/oro/piso", () => {
    const hub = new Hub();
    const player = new Player(0, 0);
    player.hp = 40;
    player.maxHp = 100;
    player.hunger = 60;
    player.maxHunger = 100;
    player.xp = 5;
    player.xpToLevel = 20;
    player.level = 3;
    player.gold = 12;

    hub.syncPlayerState(player, 4);

    expect(document.getElementById("hub-hp-text")!.textContent).toBe("40/100");
    expect(document.getElementById("hub-hunger-text")!.textContent).toBe("60/100");
    expect(document.getElementById("hub-level-text")!.textContent).toBe("Lv3");
    expect(document.getElementById("hub-attack")!.textContent).toBe(`⚔️ ${player.getEffectiveAttack()}`);
    expect(document.getElementById("hub-defense")!.textContent).toBe(`🛡️ ${player.getEffectiveDefense()}`);
    expect(document.getElementById("hub-gold")!.textContent).toBe("🪙 12");
    expect(document.getElementById("hub-floor")!.textContent).toBe("📍 Piso 4");
  });

  // Regresión: antes syncPlayerState() también re-renderizaba el log de
  // mensajes en CADA turno (llamado desde Game.render(), o sea cada
  // movimiento/acción), reescribiendo el innerHTML del log entero aunque no
  // hubiera ningún mensaje nuevo — esto reiniciaba la animación CSS
  // msgFadeIn en mensajes ya mostrados, causando un parpadeo visible en
  // cada turno. Ver skill del sistema de estado del jugador.
  describe("el log de mensajes solo se re-renderiza cuando hay un mensaje nuevo", () => {
    it("addMessage() pinta el mensaje en #hub-messages", () => {
      const hub = new Hub();
      hub.addMessage("Recogiste una espada");

      const container = document.getElementById("hub-messages")!;
      expect(container.textContent).toContain("Recogiste una espada");
    });

    it("syncPlayerState() repetido sin addMessage() NO recrea el nodo del mensaje", () => {
      const hub = new Hub();
      const player = new Player(0, 0);
      hub.addMessage("Mensaje único");

      const container = document.getElementById("hub-messages")!;
      const nodeBefore = container.firstElementChild;
      expect(nodeBefore).not.toBeNull();

      // Simula varios turnos (Game.render() llamando syncPlayerState) sin
      // que se agregue ningún mensaje nuevo entre medio.
      hub.syncPlayerState(player, 1);
      hub.syncPlayerState(player, 1);
      hub.syncPlayerState(player, 1);

      expect(container.firstElementChild).toBe(nodeBefore);
    });

    it("addMessage() sí reemplaza/agrega el nodo cuando hay contenido nuevo", () => {
      const hub = new Hub();
      hub.addMessage("Primero");
      const container = document.getElementById("hub-messages")!;
      const nodeAfterFirst = container.firstElementChild;

      hub.addMessage("Segundo");

      expect(container.firstElementChild).not.toBe(nodeAfterFirst);
      expect(container.textContent).toContain("Segundo");
    });
  });
});
