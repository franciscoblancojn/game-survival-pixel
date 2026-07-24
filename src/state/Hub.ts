import { StateBase } from "./Base";

interface HubProps {
  level: number;
  hp: number;
  maxHp: number;
  hunger: number;
  maxHunger: number;
  attack: number;
  defense: number;
  xp: number;
  xpToLevel: number;
}

export const hub = new StateBase<HubProps>("hub", {
  level: 1,
  hp: 100,
  maxHp: 100,
  hunger: 100,
  maxHunger: 100,
  attack: 10,
  defense: 5,
  xp: 0,
  xpToLevel: 100,
});
