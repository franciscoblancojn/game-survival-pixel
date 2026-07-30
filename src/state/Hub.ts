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
  hp: 100,
  maxHp: 100,
  hunger: 100,
  maxHunger: 100,
  attack: 10,
  defense: 5,
  xp: 0,
  xpToLevel: 100,
  floor: 1,
};

export const hub = new StateBase<HubProps>("hub", defaultData);

// ─── Helpers ──────────────────────────────────────────────
function setBar(id: string, current: number, max: number) {
  const el = document.getElementById(id);
  if (el) el.style.width = `${Math.min(100, (current / max) * 100)}%`;
}

function setText(id: string, text: string) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setHtml(id: string, html: string) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

// ─── Render completo del HUD ──────────────────────────────
hub.onRender = () => {
  const d = hub.data;

  // HP
  setBar("hub-hp-bar", d.hp, d.maxHp);
  setText("hub-hp-text", `${d.hp}/${d.maxHp}`);

  // Hambre
  setBar("hub-hunger-bar", d.hunger, d.maxHunger);
  setText("hub-hunger-text", `${d.hunger}/${d.maxHunger}`);

  // XP
  setBar("hub-xp-bar", d.xp, d.xpToLevel);

  // Nivel
  setText("hub-level-text", `Lv${d.level}`);

  // Stats
  setHtml("hub-attack", `⚔️ ${d.attack}`);
  setHtml("hub-defense", `🛡️ ${d.defense}`);
  setHtml("hub-floor", `📍 Piso ${d.floor}`);
};

// ─── Actualización individual de props ───────────────────
hub.onUpdateData = (key) => {
  const d = hub.data;

  switch (key) {
    case "hp":
    case "maxHp":
      setBar("hub-hp-bar", d.hp, d.maxHp);
      setText("hub-hp-text", `${d.hp}/${d.maxHp}`);
      break;
    case "hunger":
    case "maxHunger":
      setBar("hub-hunger-bar", d.hunger, d.maxHunger);
      setText("hub-hunger-text", `${d.hunger}/${d.maxHunger}`);
      break;
    case "xp":
    case "xpToLevel":
      setBar("hub-xp-bar", d.xp, d.xpToLevel);
      break;
    case "level":
      setText("hub-level-text", `Lv${d.level}`);
      break;
    case "attack":
      setHtml("hub-attack", `⚔️ ${d.attack}`);
      break;
    case "defense":
      setHtml("hub-defense", `🛡️ ${d.defense}`);
      break;
    case "floor":
      setHtml("hub-floor", `📍 Piso ${d.floor}`);
      break;
  }
};
