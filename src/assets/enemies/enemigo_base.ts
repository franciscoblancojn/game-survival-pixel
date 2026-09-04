import type { LootDrop, GoldRange, RolledLoot } from '../../scripts/types.js';

export interface EnemyBaseStats {
  /** Clave interna única — coincide con el nombre del archivo/registro en index.ts (p. ej. 'slime'). */
  type: string;
  /** Nombre mostrado al jugador. */
  name: string;
  hp: number;
  defense: number;
  attack: number;
  /**
   * Rango de detección del jugador, en casillas (distancia Manhattan).
   * Internamente el motor de juego lo conoce como `aggroRange`
   * (EnemyInstance/CombatSystem) — "vision" es el nombre de este campo en
   * la capa de definiciones; ver skill enemy-definitions para el mapeo.
   */
  vision: number;
  /** Botín que puede soltar al morir — cada entrada tira su propia probabilidad. */
  loot: LootDrop[];
  /** Oro que suelta al morir, entero uniforme entre gold.min y gold.max (inclusive). */
  gold: GoldRange;
  xp: number;
  color: string;
  darkColor: string;
  speed: number;
}

/**
 * Clase base de la que heredan todas las definiciones de enemigos en
 * src/assets/enemies/. Cada subclase (Slime, ...) pasa sus propios stats al
 * constructor vía `super({...})` — no hay valores por defecto acá a
 * propósito: una definición de enemigo incompleta debe fallar al escribirla,
 * no jugar con un stat en `undefined`.
 */
export class EnemyBase implements EnemyBaseStats {
  public readonly type: string;
  public readonly name: string;
  public readonly hp: number;
  public readonly defense: number;
  public readonly attack: number;
  public readonly vision: number;
  public readonly loot: LootDrop[];
  public readonly gold: GoldRange;
  public readonly xp: number;
  public readonly color: string;
  public readonly darkColor: string;
  public readonly speed: number;

  constructor(stats: EnemyBaseStats) {
    this.type = stats.type;
    this.name = stats.name;
    this.hp = stats.hp;
    this.defense = stats.defense;
    this.attack = stats.attack;
    this.vision = stats.vision;
    this.loot = stats.loot;
    this.gold = stats.gold;
    this.xp = stats.xp;
    this.color = stats.color;
    this.darkColor = stats.darkColor;
    this.speed = stats.speed;
  }

  /** Tira cada entrada de `loot` de forma independiente contra su `chance`. */
  rollLoot(): RolledLoot[] {
    const drops: RolledLoot[] = [];
    for (const entry of this.loot) {
      if (Math.random() < entry.chance) {
        const quantity = entry.min + Math.floor(Math.random() * (entry.max - entry.min + 1));
        drops.push({ itemType: entry.itemType, quantity });
      }
    }
    return drops;
  }

  /** Oro entero uniforme entre gold.min y gold.max (inclusive) — puede ser 0. */
  rollGold(): number {
    const { min, max } = this.gold;
    return min + Math.floor(Math.random() * (max - min + 1));
  }
}
