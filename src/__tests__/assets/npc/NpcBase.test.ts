import { describe, it, expect, vi, afterEach } from "vitest";
import { NpcBase } from "../../../assets/npc/npc_base.ts";
import { NPC_DEFINITIONS } from "../../../assets/npc/index.ts";
import { ITEM_DEFINITIONS } from "../../../assets/items/index.ts";

function makeNpc(overrides: Partial<ConstructorParameters<typeof NpcBase>[0]> = {}): NpcBase {
  return new NpcBase({
    type: "test_npc",
    name: "NPC de prueba",
    descripcion: "Un NPC de prueba.",
    color: "#fff",
    dialogos: {
      saludo: ["hola"],
      compra: ["gracias"],
      venta: ["genial"],
      sinDinero: ["no alcanza"],
      despedida: ["chau"],
    },
    inventario: [],
    ...overrides,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("NpcBase", () => {
  it("expone los stats tal cual se pasaron al constructor", () => {
    const npc = makeNpc({ name: "Grum" });
    expect(npc.name).toBe("Grum");
    expect(npc.inventario).toEqual([]);
  });

  describe("randomLine", () => {
    it("con una sola línea, siempre la devuelve", () => {
      const npc = makeNpc({ dialogos: { saludo: ["única"], compra: [], venta: [], sinDinero: [], despedida: [] } });
      expect(npc.randomLine("saludo")).toBe("única");
    });

    it("elige entre varias líneas de la lista pedida", () => {
      const npc = makeNpc({
        dialogos: { saludo: ["a", "b", "c"], compra: [], venta: [], sinDinero: [], despedida: [] },
      });
      for (let i = 0; i < 20; i++) {
        expect(["a", "b", "c"]).toContain(npc.randomLine("saludo"));
      }
    });
  });
});

describe("NPC_DEFINITIONS (src/assets/npc/)", () => {
  it("tiene al menos los 3 NPCs base del mercado", () => {
    expect(Object.keys(NPC_DEFINITIONS).length).toBeGreaterThanOrEqual(3);
  });

  it("la clave del registro coincide con el `type` de cada NPC", () => {
    for (const [key, def] of Object.entries(NPC_DEFINITIONS)) {
      expect(def.type, `clave "${key}" no coincide con type "${def.type}"`).toBe(key);
    }
  });

  it("cada entrada de `inventario` apunta a un item real registrado", () => {
    for (const [npcKey, def] of Object.entries(NPC_DEFINITIONS)) {
      for (const entry of def.inventario) {
        expect(ITEM_DEFINITIONS[entry.itemType], `${npcKey} tradea "${entry.itemType}", que no existe en ITEM_DEFINITIONS`).toBeDefined();
      }
    }
  });

  it("cada `precioBase` cae dentro de la banda [valorMinimo, valorMaximo] de su item", () => {
    for (const [npcKey, def] of Object.entries(NPC_DEFINITIONS)) {
      for (const entry of def.inventario) {
        const itemDef = ITEM_DEFINITIONS[entry.itemType];
        expect(entry.precioBase, `${npcKey}/${entry.itemType} precioBase < valorMinimo`).toBeGreaterThanOrEqual(itemDef.valorMinimo);
        expect(entry.precioBase, `${npcKey}/${entry.itemType} precioBase > valorMaximo`).toBeLessThanOrEqual(itemDef.valorMaximo);
      }
    }
  });

  it("cada NPC tiene las 5 listas de dialogos, no vacías", () => {
    const situaciones = ["saludo", "compra", "venta", "sinDinero", "despedida"] as const;
    for (const [npcKey, def] of Object.entries(NPC_DEFINITIONS)) {
      for (const situacion of situaciones) {
        expect(def.dialogos[situacion].length, `${npcKey} sin diálogo de "${situacion}"`).toBeGreaterThan(0);
      }
    }
  });
});
