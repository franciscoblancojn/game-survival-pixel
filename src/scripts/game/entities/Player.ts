import { Entity } from './Entity.js';
import { PLAYER_DEFAULTS, INVENTORY_SIZE } from '../../constants.js';
import { Tile } from '../world/Tile.js';
import type { Equipment, ItemInstance, PlayerSaveData, TileType } from '../../types.js';
import type { Dungeon } from '../world/Dungeon.js';

export class Player extends Entity {
  public hunger: number;
  public maxHunger: number;
  public level: number;
  public xp: number;
  public xpToLevel: number;
  public gold: number;

  public inventory: ItemInstance[];
  public equipment: Equipment;

  public attackAnim: number;
  public hitAnim: number;
  public moveAnim: { x: number; y: number; progress: number };

  constructor(x: number, y: number) {
    super(x, y);
    this.hp = PLAYER_DEFAULTS.hp;
    this.maxHp = PLAYER_DEFAULTS.maxHp;
    this.hunger = PLAYER_DEFAULTS.hunger;
    this.maxHunger = PLAYER_DEFAULTS.maxHunger;
    this.attack = PLAYER_DEFAULTS.attack;
    this.defense = PLAYER_DEFAULTS.defense;
    this.level = PLAYER_DEFAULTS.level;
    this.xp = PLAYER_DEFAULTS.xp;
    this.xpToLevel = PLAYER_DEFAULTS.xpToLevel;
    this.gold = 0;

    this.inventory = [];
    this.equipment = {
      weapon: null,
      armor: null,
    };

    this.attackAnim = 0;
    this.hitAnim = 0;
    this.moveAnim = { x: 0, y: 0, progress: 0 };
  }

  getEffectiveAttack(): number {
    let atk = this.attack;
    if (this.equipment.weapon) {
      atk += this.equipment.weapon.attack || 0;
    }
    return atk;
  }

  getEffectiveDefense(): number {
    let def = this.defense;
    if (this.equipment.armor) {
      def += this.equipment.armor.defense || 0;
    }
    return def;
  }

  canMoveTo(x: number, y: number, dungeon: Dungeon): boolean {
    const tile: TileType = dungeon.getTile(x, y);
    return Tile.isWalkable(tile);
  }

  moveTo(x: number, y: number, dungeon: Dungeon): boolean {
    if (this.canMoveTo(x, y, dungeon)) {
      this.x = x;
      this.y = y;
      return true;
    }
    return false;
  }

  addXP(amount: number): boolean {
    this.xp += amount;
    let leveled = false;
    while (this.xp >= this.xpToLevel) {
      this.xp -= this.xpToLevel;
      this.level++;
      this.xpToLevel = Math.floor(this.xpToLevel * 1.5);
      this.maxHp += 10;
      this.hp = Math.min(this.hp + 10, this.maxHp);
      this.attack += 1;
      this.defense += 1;
      leveled = true;
    }
    return leveled;
  }

  addItem(item: ItemInstance): boolean {
    if (item.stackable) {
      const existing = this.inventory.find(i => i.type === item.type);
      if (existing) {
        existing.quantity = (existing.quantity || 1) + (item.quantity || 1);
        return true;
      }
    }

    if (this.inventory.length >= INVENTORY_SIZE) {
      return false;
    }

    this.inventory.push({ ...item, quantity: item.quantity || 1 });
    return true;
  }

  removeItem(itemType: string, count = 1): boolean {
    const idx = this.inventory.findIndex(i => i.type === itemType);
    if (idx === -1) return false;

    const item = this.inventory[idx];
    if (item.stackable && (item.quantity || 1) > count) {
      item.quantity -= count;
    } else {
      this.inventory.splice(idx, 1);
    }
    return true;
  }

  hasItem(itemType: string, count = 1): boolean {
    const item = this.inventory.find(i => i.type === itemType);
    if (!item) return false;
    if (item.stackable) {
      return (item.quantity || 0) >= count;
    }
    return true;
  }

  getItemCount(itemType: string): number {
    const item = this.inventory.find(i => i.type === itemType);
    return item ? (item.quantity || 0) : 0;
  }

  equipItem(item: ItemInstance): boolean {
    if (item.attack) {
      if (this.equipment.weapon) {
        this.inventory.push(this.equipment.weapon);
      }
      this.equipment.weapon = item;
      this.inventory = this.inventory.filter(i => i !== item);
      return true;
    }
    if (item.defense) {
      if (this.equipment.armor) {
        this.inventory.push(this.equipment.armor);
      }
      this.equipment.armor = item;
      this.inventory = this.inventory.filter(i => i !== item);
      return true;
    }
    return false;
  }

  useItem(item: ItemInstance): string | null {
    if (item.heal) {
      this.hp = Math.min(this.maxHp, this.hp + item.heal);
      this.removeItem(item.type);
      return `Recuperaste ${item.heal} HP`;
    }
    if (item.hunger) {
      this.hunger = Math.min(this.maxHunger, this.hunger + item.hunger);
      this.removeItem(item.type);
      return `Recuperaste ${item.hunger} de hambre`;
    }
    return null;
  }

  toJSON(): PlayerSaveData {
    return {
      x: this.x, y: this.y,
      hp: this.hp, maxHp: this.maxHp,
      hunger: this.hunger, maxHunger: this.maxHunger,
      attack: this.attack, defense: this.defense,
      level: this.level, xp: this.xp, xpToLevel: this.xpToLevel,
      gold: this.gold,
      inventory: this.inventory,
      equipment: this.equipment,
    };
  }

  static fromJSON(data: PlayerSaveData): Player {
    const p = new Player(data.x, data.y);
    Object.assign(p, data);
    return p;
  }
}
