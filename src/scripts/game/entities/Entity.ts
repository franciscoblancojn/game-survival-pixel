export class Entity {
  public x: number;
  public y: number;
  public hp: number;
  public maxHp: number;
  public attack: number;
  public defense: number;
  public dead: boolean;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.hp = 10;
    this.maxHp = 10;
    this.attack = 1;
    this.defense = 0;
    this.dead = false;
  }

  /**
   * `amount` ya viene neto de defensa — CombatSystem.calculateDamage la resta
   * una sola vez (ATK - DEF + varianza, ver INSTRUCCIONES.md § Combate).
   * No restar `this.defense` de nuevo aquí.
   */
  takeDamage(amount: number): number {
    const actualDamage = Math.min(this.hp, amount);
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) {
      this.dead = true;
    }
    return actualDamage;
  }

  isAlive(): boolean {
    return this.hp > 0;
  }

  isAdjacentTo(other: Entity): boolean {
    return Math.abs(this.x - other.x) + Math.abs(this.y - other.y) === 1;
  }

  manhattanDistanceTo(other: Entity): number {
    return Math.abs(this.x - other.x) + Math.abs(this.y - other.y);
  }
}
