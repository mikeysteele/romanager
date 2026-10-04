import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { when } from 'lit/directives/when.js';
import type { GameRead } from '@repo/shared';

import '../app-game-list/app-game-list.ts';

interface System {
  id: string;
  name: string;
  slug: string;
  path: string;
}

@customElement('app-library')
export class AppLibrary extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }
    .library-header {
      margin-bottom: var(--spacing-xl);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--spacing-md);
      flex-wrap: wrap;
    }
    .library-title-group {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
    }
    .game-count-badge {
      font-size: 0.8rem;
      background: rgba(255, 255, 255, 0.08);
      color: var(--color-text-secondary);
      padding: 4px 10px;
      border-radius: 12px;
      font-weight: 500;
    }
    .filter-input {
      padding: 8px 14px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: var(--border-radius-md, 8px);
      color: var(--color-text-primary, #fff);
      font-size: 0.9rem;
      width: 240px;
      outline: none;
      transition: border-color 0.2s;
    }
    .filter-input:focus {
      border-color: var(--color-accent-primary, #f5c518);
      background: rgba(255, 255, 255, 0.08);
    }
    .loading, .empty-state {
      text-align: center;
      padding: var(--spacing-2xl);
      color: var(--color-text-secondary);
      font-style: italic;
    }
  `;

  @state() games: GameRead[] = [];
  @state() activeSystem: System | null = null;
  @state() loading: boolean = false;
  @state() filterQuery: string = '';

  override connectedCallback() {
      super.connectedCallback();
      if (typeof globalThis.location !== 'undefined' && globalThis.location.search) {
        const params = new URLSearchParams(globalThis.location.search);
        const searchParam = params.get('search');
        if (searchParam) {
          this.filterQuery = searchParam;
        }
      }
      this.handleRouteParams(); // Initial load
      globalThis.addEventListener('roms-updated', this.handleRomsUpdated);
      globalThis.addEventListener('library-search', this.handleLibrarySearch as EventListener);
  }

  override disconnectedCallback() {
      super.disconnectedCallback();
      globalThis.removeEventListener('roms-updated', this.handleRomsUpdated);
      globalThis.removeEventListener('library-search', this.handleLibrarySearch as EventListener);
  }

  handleLibrarySearch = (e: CustomEvent<{ query: string }>) => {
      this.filterQuery = e.detail?.query || '';
  };

  override willUpdate(changedProperties: Map<string, unknown>) {
      if (changedProperties.has('systemSlug')) {
          this.handleRouteParams();
      }
  }

  handleRomsUpdated = () => {
      this.handleRouteParams();
  }

  handleRouteParams() {
   
      this.fetchGames(); // Fetch all
    
  }

  async fetchGames(systemSlug?: string) {
    try {
      this.loading = true;
      const url = '/api/games';
      
      
      const res = await fetch(url);
      if (res.ok) {
          const data = await res.json();
          if (systemSlug) {
             this.games = data.games || [];
             this.activeSystem = { id: data.id || '', name: data.name, slug: data.slug, path: data.path };
          } else {
             this.games = Array.isArray(data) ? data : [];
          }
      }
    } catch (e) {
      console.error('Error fetching games', e);
      this.games = [];
    } finally {
      this.loading = false;
    }
  }

  get filteredGames() {
      if (!this.filterQuery) return this.games;
      const lowerQ = this.filterQuery.toLowerCase();
      return this.games.filter(g => 
          (g.name && g.name.toLowerCase().includes(lowerQ))
      );
  }

  handleFilterInput(e: Event) {
      const input = e.target as HTMLInputElement;
      this.filterQuery = input.value;
  }

  override render() {
    return html`
      <div class="library-container">
        
        <div class="library-header">
           <div class="library-title-group">
             <h2>Library</h2>
             ${this.games.length > 0 ? html`<span class="game-count-badge">${this.games.length} games</span>` : ''}
           </div>
           ${this.games.length > 0 ? html`
             <input 
               type="text" 
               class="filter-input" 
               placeholder="Filter games..." 
               .value=${this.filterQuery} 
               @input=${this.handleFilterInput} 
             />
           ` : ''}
        </div>

        ${when(this.loading, () => html`<div class="loading">Loading...</div>`)}

        ${when(!this.loading, () => html`
              <div class="games-view">
                 ${this.filteredGames.length === 0 ? html`
                    <div class="empty-state">No games found.</div>
                 ` : ''}
                 <app-game-list 
                    .games=${this.filteredGames} 
                 ></app-game-list>
              </div>
        `)}
      </div>
    `;
  }
}
