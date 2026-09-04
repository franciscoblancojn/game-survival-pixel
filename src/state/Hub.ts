import { StateBase } from "./Base";

export interface HubProps {
  level: number;
  hp: number;
  maxHp: number;
  hunger: number;
  maxHunger: number;
  attack: number;
  defense: number;
  xp: number;
  xpToLevel: number;
  floor: number;
}

const defaultData: HubProps = {
  level: 1,
  hp: 10,
  maxHp: 100,
  hunger: 100,
  maxHunger: 100,
  attack: 10,
  defense: 5,
  xp: 0,
  xpToLevel: 100,
  floor: 1,
};

export class Hub  extends StateBase<HubProps> {

  constructor(){
    console.log(defaultData);
    
    super("hub", defaultData)
  }
}


export const hub = new Hub();

