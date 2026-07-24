import { RECIPES, canCraft, craft } from '../game/data/recipes.js';
import type { Game } from '../game/Game.js';
import type { RecipeStation } from '../types.js';

interface CraftingStation {
  id: RecipeStation;
  name: string;
  icon: string;
}

export class CraftingUI {
  private game: Game;
  public visible: boolean;
  public selectedStation: RecipeStation;
  private stations: CraftingStation[];

  constructor(game: Game) {
    this.game = game;
    this.visible = false;
    this.selectedStation = 'workbench';
    this.stations = [
      { id: 'workbench', name: '🪵 Banco de trabajo', icon: '🪵' },
      { id: 'furnace', name: '🔥 Horno', icon: '🔥' },
      { id: 'anvil', name: '🔨 Yunque', icon: '🔨' },
      { id: 'alchemy', name: '🧪 Mesón', icon: '🧪' },
    ];
  }

  toggle(): void {
    this.visible = !this.visible;
    const el = document.getElementById('crafting-overlay');
    if (el) {
      el.style.display = this.visible ? 'flex' : 'none';
    }
    if (this.visible) this.render();
  }

  render(): void {
    if (!this.visible) return;

    const el = document.getElementById('crafting-overlay');
    if (!el) return;

    const { player } = this.game;
    const recipes = RECIPES[this.selectedStation] || {};

    el.innerHTML = `
      <div class="crafting-panel">
        <div class="crafting-header">
          <h3>⚒️ Crafteo</h3>
          <button class="crafting-close" onclick="window.gameInstance?.toggleCrafting()">✕</button>
        </div>
        <div class="crafting-stations">
          ${this.stations.map(s => `
            <button class="station-btn ${this.selectedStation === s.id ? 'active' : ''}"
                    onclick="window.gameInstance?.selectStation('${s.id}')">
              ${s.icon}
            </button>
          `).join('')}
        </div>
        <div class="crafting-recipes">
          ${Object.entries(recipes).map(([key, recipe]) => {
            const craftable = canCraft(recipe, player.inventory);
            const materials = Object.entries(recipe.materials).map(([mat, count]) => {
              const have = player.getItemCount(mat);
              return `<span class="${have >= count ? 'has' : 'missing'}">${mat}: ${have}/${count}</span>`;
            }).join(' ');

            return `
              <div class="recipe-card ${craftable ? 'craftable' : 'locked'}">
                <div class="recipe-info">
                  <div class="recipe-name">${recipe.name}</div>
                  <div class="recipe-materials">${materials}</div>
                </div>
                <button class="recipe-craft-btn"
                        ${craftable ? '' : 'disabled'}
                        onclick="window.gameInstance?.craftItem('${this.selectedStation}', '${key}')">
                  ${craftable ? 'Craftear' : 'Falta'}
                </button>
              </div>
            `;
          }).join('')}
          ${Object.keys(recipes).length === 0 ? '<div class="no-recipes">No hay recetas disponibles</div>' : ''}
        </div>
      </div>
    `;
  }

  selectStation(stationId: string): void {
    this.selectedStation = stationId as RecipeStation;
    this.render();
  }

  craftItem(stationId: string, recipeKey: string): void {
    const recipes = RECIPES[stationId as RecipeStation];
    if (!recipes || !recipes[recipeKey]) return;

    const recipe = recipes[recipeKey];
    const { player } = this.game;

    if (!canCraft(recipe, player.inventory)) return;

    const item = craft(recipe, player.inventory);
    const added = player.addItem(item);

    if (added) {
      this.game.addMessage(`Crafteaste ${recipe.name}`);
    } else {
      this.game.addMessage('Inventario lleno!');
    }

    this.render();
  }
}
