import { describe, it, expect, vi, afterEach } from "vitest";
import { EnemyBase } from "../../../assets/enemies/enemigo_base.ts";
import { Slime } from "../../../assets/enemies/slime.ts";
import { Rat } from "../../../assets/enemies/rat.ts";
import { Skeleton } from "../../../assets/enemies/skeleton.ts";
import { ENEMY_DEFINITIONS } from "../../../assets/enemies/index.ts";

function makeBase(overrides: Partial<ConstructorParameters<typeof EnemyBase>[0]> = {}): EnemyBase {
  return new EnemyBase({
    type: "test_enemy",
    name: "Enemigo de prueba",
    hp: 10,
    defense: 1,
    attack: 2,
    vision: 5,
    loot: [],
    gold: { min: 0, max: 0 },
    xp: 3,
    color: "#fff",
    darkColor: "#000",
    speed: 1,
    ...overrides,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("EnemyBase", () => {
  it("expone los stats tal cual se pasaron al constructor", () => {
    const enemy = makeBase({ hp: 42, defense: 7, attack: 9, vision: 12, xp: 15 });
    expect(enemy.hp).toBe(42);
    expect(enemy.defense).toBe(7);
    expect(enemy.attack).toBe(9);
    expect(enemy.vision).toBe(12);
    expect(enemy.xp).toBe(15);
  });

  describe("rollGold", () => {
    it("devuelve un entero dentro del rango [min, max] inclusive", () => {
      const enemy = makeBase({ gold: { min: 3, max: 3 } });
      expect(enemy.rollGold()).toBe(3);
    });

    it("puede devolver 0 cuando el rango incluye 0", () => {
      vi.spyOn(Math, "random").mockReturnValue(0); // fuerza el mínimo del rango
      const enemy = makeBase({ gold: { min: 0, max: 10 } });
      expect(enemy.rollGold()).toBe(0);
    });

    it("nunca supera el máximo del rango", () => {
      const enemy = makeBase({ gold: { min: 0, max: 10 } });
      for (let i = 0; i < 200; i++) {
        const gold = enemy.rollGold();
        expect(gold).toBeGreaterThanOrEqual(0);
        expect(gold).toBeLessThanOrEqual(10);
      }
    });
  });

  describe("rollLoot", () => {
    it("con probabilidad 0 nunca cae", () => {
      const enemy = makeBase({ loot: [{ itemType: "wood", chance: 0, min: 1, max: 3 }] });
      for (let i = 0; i < 50; i++) {
        expect(enemy.rollLoot()).toHaveLength(0);
      }
    });

    it("con probabilidad 1 siempre cae, con cantidad dentro del rango", () => {
      const enemy = makeBase({ loot: [{ itemType: "wood", chance: 1, min: 2, max: 4 }] });
      for (let i = 0; i < 50; i++) {
        const drops = enemy.rollLoot();
        expect(drops).toHaveLength(1);
        expect(drops[0].itemType).toBe("wood");
        expect(drops[0].quantity).toBeGreaterThanOrEqual(2);
        expect(drops[0].quantity).toBeLessThanOrEqual(4);
      }
    });

    it("evalúa cada entrada de loot de forma independiente", () => {
      const enemy = makeBase({
        loot: [
          { itemType: "wood", chance: 1, min: 1, max: 1 },
          { itemType: "stone", chance: 0, min: 1, max: 1 },
        ],
      });
      const drops = enemy.rollLoot();
      expect(drops).toHaveLength(1);
      expect(drops[0].itemType).toBe("wood");
    });
  });
});

describe("Slime — primer enemigo migrado a src/assets/enemies/", () => {
  it("tiene exactamente los stats pedidos (vida 20, defensa 0, ataque 5, vision 25)", () => {
    const slime = new Slime();
    expect(slime.type).toBe("slime");
    expect(slime.hp).toBe(20);
    expect(slime.defense).toBe(0);
    expect(slime.attack).toBe(5);
    expect(slime.vision).toBe(25);
  });

  it("suelta oro entre 0 y 10", () => {
    const slime = new Slime();
    for (let i = 0; i < 100; i++) {
      const gold = slime.rollGold();
      expect(gold).toBeGreaterThanOrEqual(0);
      expect(gold).toBeLessThanOrEqual(10);
    }
  });

  it("su loot es bola de slime, 50% de probabilidad, 1 a 3 unidades", () => {
    expect(slimeLootEntry().itemType).toBe("slime_ball");
    expect(slimeLootEntry().chance).toBe(0.5);
    expect(slimeLootEntry().min).toBe(1);
    expect(slimeLootEntry().max).toBe(3);
  });

  function slimeLootEntry() {
    const slime = new Slime();
    return slime.loot[0];
  }
});

describe("Rat — migrada desde ENEMY_TYPES (constants.ts)", () => {
  it("conserva los stats que tenía en el sistema viejo", () => {
    const rat = new Rat();
    expect(rat.type).toBe("rat");
    expect(rat.hp).toBe(15);
    expect(rat.defense).toBe(0);
    expect(rat.attack).toBe(3);
    expect(rat.vision).toBe(4); // antes aggroRange: 4
    expect(rat.xp).toBe(5);
  });

  it("suelta oro entre 0 y 5 (menos que el slime)", () => {
    const rat = new Rat();
    for (let i = 0; i < 100; i++) {
      const gold = rat.rollGold();
      expect(gold).toBeGreaterThanOrEqual(0);
      expect(gold).toBeLessThanOrEqual(5);
    }
  });

  it("tiene al menos una entrada de loot", () => {
    expect(new Rat().loot.length).toBeGreaterThan(0);
  });
});

describe("Skeleton — migrado desde ENEMY_TYPES (constants.ts)", () => {
  it("conserva los stats que tenía en el sistema viejo", () => {
    const skeleton = new Skeleton();
    expect(skeleton.type).toBe("skeleton");
    expect(skeleton.hp).toBe(30);
    expect(skeleton.defense).toBe(2);
    expect(skeleton.attack).toBe(6);
    expect(skeleton.vision).toBe(6); // antes aggroRange: 6
    expect(skeleton.xp).toBe(12);
  });

  it("es más fuerte que rat y suelta más oro (3-15 vs 0-5)", () => {
    const skeleton = new Skeleton();
    const rat = new Rat();
    expect(skeleton.hp).toBeGreaterThan(rat.hp);
    expect(skeleton.attack).toBeGreaterThan(rat.attack);
    expect(skeleton.gold.min).toBeGreaterThan(rat.gold.min);
    expect(skeleton.gold.max).toBeGreaterThan(rat.gold.max);
  });

  it("tiene al menos una entrada de loot", () => {
    expect(new Skeleton().loot.length).toBeGreaterThan(0);
  });
});

describe("ENEMY_DEFINITIONS — registro central", () => {
  it("incluye los 3 enemigos migrados (slime, rat, skeleton)", () => {
    expect(ENEMY_DEFINITIONS.slime).toBeInstanceOf(Slime);
    expect(ENEMY_DEFINITIONS.rat).toBeInstanceOf(Rat);
    expect(ENEMY_DEFINITIONS.skeleton).toBeInstanceOf(Skeleton);
  });

  it("cada entrada es una instancia de EnemyBase con `type` igual a su clave en el registro", () => {
    for (const [key, def] of Object.entries(ENEMY_DEFINITIONS)) {
      expect(def).toBeInstanceOf(EnemyBase);
      expect(def.type).toBe(key);
    }
  });

  it("cada entrada tiene loot y oro completos (nada a medio definir)", () => {
    for (const def of Object.values(ENEMY_DEFINITIONS)) {
      expect(Array.isArray(def.loot)).toBe(true);
      expect(typeof def.gold.min).toBe("number");
      expect(typeof def.gold.max).toBe("number");
      expect(def.gold.max).toBeGreaterThanOrEqual(def.gold.min);
      for (const entry of def.loot) {
        expect(entry.chance).toBeGreaterThanOrEqual(0);
        expect(entry.chance).toBeLessThanOrEqual(1);
        expect(entry.max).toBeGreaterThanOrEqual(entry.min);
      }
    }
  });
});
