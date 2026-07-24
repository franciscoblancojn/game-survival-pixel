import { RECIPES, canCraft, craft } from '../game/data/recipes.js';
import type { Game } from '../game/Game.js';
import type { RecipeStation } from '../types.js';

/**
 * CraftingUI — Gestiona el overlay de crafteo.
 *
 * El HTML base ya existe en .astro. Solo actualiza contenido dinámico.
 */
export class CraftingUI {
  private game: Game;
  public visible: boolean;
  public selectedStation: RecipeStation;

  constructor(game: Game) {
    this.game = game;
    this.visible = false;
    this.selectedStation = 'workbench';
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

    // Actualizar estaciones activas
    this.renderStations();

    // Actualizar recetas
    this.renderRecipes();
  }

  private renderStations(): void {
    const stationsContainer = document.getElementById('crafting-stations');
    if (!stationsContainer) return;

    const stations = [
      { id: 'workbench', icon: '🪵' },
      { id: 'furnace', icon: '🔥' },
      { id: 'anvil', icon: '🔨' },
      { id: 'alchemy', icon: '🧪' },
    ];

    stationsContainer.innerHTML = stations
      .map(
        s => `
      <button class="station-btn ${this.selectedStation === s.id ? 'active' : ''}"
              data-station="${s.id}">
        ${s.icon}
      </button>
    `
      )
      .join('');

    // Agregar event listeners
    stationsContainer.querySelectorAll('.station-btn[data-station]').forEach(btn => {
      btn.addEventListener('click', () => {
        const stationId = btn.getAttribute('data-station') as RecipeStation;
        this.selectStation(stationId);
      });
    });
  }

  private renderRecipes(): void {
    const recipesContainer = document.getElementById('crafting-recipes');
    if (!recipesContainer) return;

    const { player } = this.game;
    const recipes = RECIPES[this.selectedStation] || {};

    if (Object.keys(recipes).length === 0) {
      recipesContainer.innerHTML = '<div class="no-recipes">No hay recetas disponibles</div>';
      return;
    }

    recipesContainer.innerHTML = Object.entries(recipes)
      .map(([key, recipe]) => {
        const craftable = canCraft(recipe, player.inventory);
        const materials = Object.entries(recipe.materials)
          .map(([mat, count]) => {
            const have = player.getItemCount(mat);
            return `<span class="${have >= count ? 'has' : 'missing'}">${mat}: ${have}/${count}</span>`;
          })
          .join(' ');

        return `
        <div class="recipe-card ${craftable ? 'craftable' : 'locked'}">
          <div class="recipe-info">
            <div class="recipe-name">${recipe.name}</div>
            <div class="recipe-materials">${materials}</div>
          </div>
          <button class="recipe-craft-btn" data-station="${this.selectedStation}" data-recipe="${key}"
                  ${craftable ? '' : 'disabled'}>
            ${craftable ? 'Craftear' : 'Falta'}
          </button>
        </div>
      `;
      })
      .join('');

    // Agregar event listeners
    recipesContainer.querySelectorAll('button[data-recipe]').forEach(btn => {
      btn.addEventListener('click', () => {
        const stationId = btn.getAttribute('data-station')!;
        const recipeKey = btn.getAttribute('data-recipe')!;
        this.craftItem(stationId, recipeKey);
      });
    });
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
