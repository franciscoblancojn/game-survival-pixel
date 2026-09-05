import { ItemBase } from './item_base.js';
import { RustySword } from './rusty_sword.js';
import { StoneAxe } from './stone_axe.js';
import { SharpDagger } from './sharp_dagger.js';
import { WornTunic } from './worn_tunic.js';
import { Chainmail } from './chainmail.js';
import { IronPlate } from './iron_plate.js';
import { Pickaxe } from './pickaxe.js';
import { Shovel } from './shovel.js';
import { Torch } from './torch.js';
import { HealthPotion } from './health_potion.js';
import { HungerPotion } from './hunger_potion.js';
import { DriedRation } from './dried_ration.js';
import { Wood } from './wood.js';
import { Stone } from './stone.js';
import { IronOre } from './iron_ore.js';
import { Leather } from './leather.js';
import { SlimeBall } from './slime_ball.js';

/**
 * Registro central de definiciones de items: cada uno es una clase que
 * hereda de ItemBase, con buff/efectoUso/valorMinimo/valorMaximo/crafteo. Es la única fuente
 * de verdad para qué items existen y cómo se craftean — el viejo ITEM_TYPES
 * plano (constants.ts) y la tabla RECIPES hardcodeada (game/data/recipes.ts)
 * se retiraron/derivaron de acá. Ver skill item-definitions antes de agregar
 * uno nuevo.
 *
 * Para agregar un item: crear su archivo en esta carpeta (clase que extiende
 * ItemBase) y sumarlo acá con su `type` como clave.
 */
export const ITEM_DEFINITIONS: Record<string, ItemBase> = {
  rusty_sword: new RustySword(),
  stone_axe: new StoneAxe(),
  sharp_dagger: new SharpDagger(),
  worn_tunic: new WornTunic(),
  chainmail: new Chainmail(),
  iron_plate: new IronPlate(),
  pickaxe: new Pickaxe(),
  shovel: new Shovel(),
  torch: new Torch(),
  health_potion: new HealthPotion(),
  hunger_potion: new HungerPotion(),
  dried_ration: new DriedRation(),
  wood: new Wood(),
  stone: new Stone(),
  iron_ore: new IronOre(),
  leather: new Leather(),
  slime_ball: new SlimeBall(),
};

export { ItemBase } from './item_base.js';
export type { ItemBaseStats, ItemBuff, ItemUseEffect } from './item_base.js';
