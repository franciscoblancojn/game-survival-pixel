import { describe, it, expect, beforeEach } from "vitest";
import { hub } from "../../state/Hub.ts";

describe("Hub", () => {
  beforeEach(() => {
    // Reset hub data to defaults before each test
    hub.data.level = 1;
    hub.data.hp = 100;
    hub.data.maxHp = 100;
    hub.data.hunger = 100;
    hub.data.maxHunger = 100;
    hub.data.attack = 10;
    hub.data.defense = 5;
    hub.data.xp = 0;
    hub.data.xpToLevel = 100;
    hub.data.floor = 1;

    // Set up the HUD DOM structure
    document.body.innerHTML = `
      <div id="hud" class="hud">
        <div class="hud-bars">
          <div class="hud-bar-row">
            <span class="hud-icon">❤️</span>
            <div class="hud-bar">
              <div id="hub-hp-bar" class="hud-bar-fill hp" style="width: 100%"></div>
            </div>
            <span id="hub-hp-text" class="hud-bar-text">100/100</span>
          </div>
          <div class="hud-bar-row">
            <span class="hud-icon">🍖</span>
            <div class="hud-bar">
              <div id="hub-hunger-bar" class="hud-bar-fill hunger" style="width: 100%"></div>
            </div>
            <span id="hub-hunger-text" class="hud-bar-text">100/100</span>
          </div>
          <div class="hud-bar-row">
            <span class="hud-icon">⭐</span>
            <div class="hud-bar">
              <div id="hub-xp-bar" class="hud-bar-fill xp" style="width: 0%"></div>
            </div>
            <span id="hub-level-text" class="hud-bar-text">Lv1</span>
          </div>
        </div>
        <div class="hud-stats">
          <span id="hub-attack">⚔️ 10</span>
          <span id="hub-defense">🛡️ 5</span>
          <span id="hub-floor">📍 Piso 1</span>
        </div>
        <div id="hub-messages" class="hud-messages"></div>
      </div>
    `;
  });

  describe("initial state", () => {
    it("should start at level 1", () => {
      expect(hub.data.level).toBe(1);
    });

    it("should have max HP", () => {
      expect(hub.data.hp).toBe(hub.data.maxHp);
    });

    it("should have full hunger", () => {
      expect(hub.data.hunger).toBe(hub.data.maxHunger);
    });
  });

  describe("onRender", () => {
    it("should render HP bar correctly", () => {
      hub.onRender();
      const hpBar = document.getElementById("hub-hp-bar");
      expect(hpBar?.style.width).toBe("100%");
    });

    it("should render HP text correctly", () => {
      hub.onRender();
      const hpText = document.getElementById("hub-hp-text");
      expect(hpText?.textContent).toBe("100/100");
    });

    it("should render partial HP correctly", () => {
      hub.data.hp = 50;
      hub.onRender();

      const hpBar = document.getElementById("hub-hp-bar");
      expect(hpBar?.style.width).toBe("50%");

      const hpText = document.getElementById("hub-hp-text");
      expect(hpText?.textContent).toBe("50/100");
    });

    it("should render hunger bar correctly", () => {
      hub.data.hunger = 30;
      hub.onRender();

      const hungerBar = document.getElementById("hub-hunger-bar");
      expect(hungerBar?.style.width).toBe("30%");

      const hungerText = document.getElementById("hub-hunger-text");
      expect(hungerText?.textContent).toBe("30/100");
    });

    it("should render XP bar correctly", () => {
      hub.data.xp = 50;
      hub.onRender();

      const xpBar = document.getElementById("hub-xp-bar");
      expect(xpBar?.style.width).toBe("50%");
    });

    it("should render level text", () => {
      hub.data.level = 3;
      hub.onRender();

      const levelText = document.getElementById("hub-level-text");
      expect(levelText?.textContent).toBe("Lv3");
    });

    it("should render attack stat", () => {
      hub.data.attack = 20;
      hub.onRender();

      const attackEl = document.getElementById("hub-attack");
      expect(attackEl?.innerHTML).toBe("⚔️ 20");
    });

    it("should render defense stat", () => {
      hub.data.defense = 15;
      hub.onRender();

      const defenseEl = document.getElementById("hub-defense");
      expect(defenseEl?.innerHTML).toBe("🛡️ 15");
    });

    it("should render floor", () => {
      hub.data.floor = 5;
      hub.onRender();

      const floorEl = document.getElementById("hub-floor");
      expect(floorEl?.innerHTML).toBe("📍 Piso 5");
    });
  });

  describe("onUpdateData — individual updates", () => {
    it("should update only HP when hp changes", () => {
      hub.data.hp = 75;
      hub.onUpdateData("hp");

      const hpText = document.getElementById("hub-hp-text");
      expect(hpText?.textContent).toBe("75/100");
    });

    it("should update HP when maxHp changes", () => {
      hub.data.maxHp = 200;
      hub.onUpdateData("maxHp");

      const hpText = document.getElementById("hub-hp-text");
      expect(hpText?.textContent).toBe("100/200");
    });

    it("should update hunger when hunger changes", () => {
      hub.data.hunger = 0;
      hub.onUpdateData("hunger");

      const hungerBar = document.getElementById("hub-hunger-bar");
      expect(hungerBar?.style.width).toBe("0%");
    });

    it("should update XP bar", () => {
      hub.data.xp = 80;
      hub.onUpdateData("xp");

      const xpBar = document.getElementById("hub-xp-bar");
      expect(xpBar?.style.width).toBe("80%");
    });

    it("should update level", () => {
      hub.data.level = 5;
      hub.onUpdateData("level");

      const levelText = document.getElementById("hub-level-text");
      expect(levelText?.textContent).toBe("Lv5");
    });

    it("should update attack", () => {
      hub.data.attack = 30;
      hub.onUpdateData("attack");

      const attackEl = document.getElementById("hub-attack");
      expect(attackEl?.innerHTML).toBe("⚔️ 30");
    });
  });

  describe("edge cases", () => {
    it("should not go above 100% for bar widths", () => {
      hub.data.hp = 150;
      hub.onUpdateData("hp");

      const hpBar = document.getElementById("hub-hp-bar");
      // Math.min caps at 100
      expect(hpBar?.style.width).toBe("100%");
    });

    it("should handle 0 HP gracefully", () => {
      hub.data.hp = 0;
      hub.onRender();

      const hpText = document.getElementById("hub-hp-text");
      expect(hpText?.textContent).toBe("0/100");

      const hpBar = document.getElementById("hub-hp-bar");
      expect(hpBar?.style.width).toBe("0%");
    });
  });
});
