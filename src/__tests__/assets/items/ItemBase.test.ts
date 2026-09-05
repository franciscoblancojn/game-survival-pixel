import { describe, it, expect } from "vitest";
import { ItemBase } from "../../../assets/items/item_base.ts";
import { ITEM_DEFINITIONS } from "../../../assets/items/index.ts";
import { RustySword } from "../../../assets/items/rusty_sword.ts";
import { HealthPotion } from "../../../assets/items/health_potion.ts";
import { Wood } from "../../../assets/items/wood.ts";
import { createItemInstance } from "../../../scripts/game/systems/ItemSystem.ts";
import { RECIPES, canCraft, craft } from "../../../scripts/game/data/recipes.ts";

function makeBase(overrides: Partial<ConstructorParameters<typeof ItemBase>[0]> = {}): ItemBase {
  return new ItemBase({
    type: "test_item",
    name: "Item de prueba",
    category: "material",
    descripcion: "Un item de prueba.",
    valorMinimo: 3,
    valorMaximo: 8,
    icon: "❔",
    color: "#fff",
    ...overrides,
  });
}

describe("ItemBase", () => {
  it("expone los stats tal cual se pasaron al constructor", () => {
    const item = makeBase({
      buff: { attack: 2, defense: 3 },
      efectoUso: { vida: 20, comida: 10 },
      valorMinimo: 6,
      valorMaximo: 14,
      crafteo: { slime_ball: 1, stone: 2 },
      estacion: "workbench",
    });
    expect(item.buff).toEqual({ attack: 2, defense: 3 });
    expect(item.efectoUso).toEqual({ vida: 20, comida: 10 });
    expect(item.valorMinimo).toBe(6);
    expect(item.valorMaximo).toBe(14);
    expect(item.crafteo).toEqual({ slime_ball: 1, stone: 2 });
    expect(item.estacion).toBe("workbench");
  });

  it("buff/efectoUso/crafteo son opcionales", () => {
    const item = makeBase();
    expect(item.buff).toBeUndefined();
    expect(item.efectoUso).toBeUndefined();
    expect(item.crafteo).toBeUndefined();
  });
});

describe("ITEM_DEFINITIONS (src/assets/items/)", () => {
  it("tiene al menos los items que tenía el sistema plano anterior", () => {
    expect(Object.keys(ITEM_DEFINITIONS).length).toBeGreaterThanOrEqual(17);
  });

  it("la clave del registro coincide con el `type` de cada item", () => {
    for (const [key, def] of Object.entries(ITEM_DEFINITIONS)) {
      expect(def.type, `clave "${key}" no coincide con type "${def.type}"`).toBe(key);
    }
  });

  it("cada item tiene icon, color, descripcion y banda de valor definidos", () => {
    for (const [key, def] of Object.entries(ITEM_DEFINITIONS)) {
      expect(def.icon, `${key} sin icon`).toBeTruthy();
      expect(def.color, `${key} sin color`).toBeTruthy();
      expect(def.descripcion, `${key} sin descripcion`).toBeTruthy();
      expect(def.valorMinimo, `${key} sin valorMinimo`).toBeGreaterThanOrEqual(0);
      expect(def.valorMaximo, `${key} valorMaximo < valorMinimo`).toBeGreaterThanOrEqual(def.valorMinimo);
    }
  });

  it("todo item con `crafteo` también tiene `estacion`, y viceversa", () => {
    for (const [key, def] of Object.entries(ITEM_DEFINITIONS)) {
      if (def.crafteo) expect(def.estacion, `${key} tiene crafteo sin estacion`).toBeTruthy();
      if (def.estacion) expect(def.crafteo, `${key} tiene estacion sin crafteo`).toBeTruthy();
    }
  });
});

describe("RustySword — arma migrada a src/assets/items/", () => {
  it("tiene los stats esperados (ataque +3, crafteable en el banco)", () => {
    const sword = new RustySword();
    expect(sword.category).toBe("weapon");
    expect(sword.buff?.attack).toBe(3);
    expect(sword.crafteo).toEqual({ wood: 3, stone: 1 });
    expect(sword.estacion).toBe("workbench");
  });
});

describe("HealthPotion — consumible migrado a src/assets/items/", () => {
  it("cura 30 de vida", () => {
    const potion = new HealthPotion();
    expect(potion.category).toBe("consumable");
    expect(potion.efectoUso?.vida).toBe(30);
  });
});

describe("Wood — material apilable", () => {
  it("es apilable y sin crafteo", () => {
    const wood = new Wood();
    expect(wood.stackable).toBe(true);
    expect(wood.crafteo).toBeUndefined();
  });
});

describe("createItemInstance (src/scripts/game/systems/ItemSystem.ts)", () => {
  it("aplana buff/efectoUso de la definición a los campos planos de ItemInstance", () => {
    const item = createItemInstance("rusty_sword", 1, 2, "id_1");
    expect(item).not.toBeNull();
    expect(item?.attack).toBe(3);
    expect(item?.defense).toBeUndefined();
    expect(item?.x).toBe(1);
    expect(item?.y).toBe(2);

    const potion = createItemInstance("health_potion", 0, 0, "id_2");
    expect(potion?.heal).toBe(30);
    expect(potion?.hunger).toBeUndefined();
  });

  it("devuelve null para un type no registrado", () => {
    expect(createItemInstance("item_inexistente", 0, 0, "id_3")).toBeNull();
  });
});

describe("RECIPES (derivadas de ITEM_DEFINITIONS)", () => {
  it("agrupa cada item craftable bajo su estacion, con los materiales de su propia definición", () => {
    expect(RECIPES.workbench.rusty_sword.materials).toEqual(ITEM_DEFINITIONS.rusty_sword.crafteo);
    expect(RECIPES.alchemy.health_potion.materials).toEqual(ITEM_DEFINITIONS.health_potion.crafteo);
  });

  it("craft() devuelve un item con sus stats reales, no solo icon/color", () => {
    const recipe = RECIPES.alchemy.health_potion;
    // Inventario armado a partir de lo que la receta pida en este momento —
    // no hardcodea los ingredientes, así que sigue de pie si se rebalancea
    // health_potion (como ya pasó una vez: era wood+stone, ahora slime_ball).
    const inventory = Object.entries(recipe.materials).map(([type, count], i) => ({
      id: `mat_${i}`, type, name: type, x: 0, y: 0, quantity: count, stackable: true, icon: '?', color: '#fff',
    }));
    expect(canCraft(recipe, inventory)).toBe(true);

    const crafted = craft(recipe, inventory);
    expect(crafted.heal).toBe(30);
    expect(inventory).toHaveLength(0);
  });
});
