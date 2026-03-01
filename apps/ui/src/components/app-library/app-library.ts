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
      align-items: center;
      gap: var(--spacing-md);
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
      this.handleRouteParams(); // Initial load
      globalThis.addEventListener('roms-updated', this.handleRomsUpdated);
  }

  override disconnectedCallback() {
      super.disconnectedCallback();
      globalThis.removeEventListener('roms-updated', this.handleRomsUpdated);
  }

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
           <h2>Library</h2>
           
          
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
