import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { when } from 'lit/directives/when.js';
import type { GameRead } from '@repo/shared';

import '../app-game-list/app-game-list.ts';

interface SystemDetail {
  id: string;
  name: string;
  slug: string;
  path: string;
  games?: GameRead[];
}

@customElement('app-system-detail')
export class AppSystemDetail extends LitElement {
  static override styles = css`
    :host {
      display: block;
      padding: var(--spacing-xl, 24px);
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs, 8px);
      margin-bottom: var(--spacing-md, 16px);
      font-size: 0.875rem;
      color: var(--color-text-secondary, #a0a0a0);
    }

    .breadcrumb a {
      color: var(--color-accent-primary, #f5c518);
      text-decoration: none;
    }

    .breadcrumb a:hover {
      text-decoration: underline;
    }

    .system-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--spacing-xl, 24px);
      flex-wrap: wrap;
      gap: var(--spacing-md, 16px);
    }

    .system-title-group h2 {
      margin: 0 0 var(--spacing-xs, 8px) 0;
      font-size: 1.85rem;
      font-weight: 700;
      color: var(--color-text-primary, #fff);
      letter-spacing: -0.02em;
    }

    .system-meta {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm, 12px);
      flex-wrap: wrap;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: var(--border-radius-sm, 6px);
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .badge-primary {
      background: rgba(245, 197, 24, 0.15);
      color: var(--color-accent-primary, #f5c518);
      border: 1px solid rgba(245, 197, 24, 0.3);
    }

    .badge-path {
      background: rgba(255, 255, 255, 0.05);
      color: var(--color-text-secondary, #a0a0a0);
      border: 1px solid rgba(255, 255, 255, 0.1);
      font-family: monospace;
      font-size: 0.8rem;
    }

    .search-input {
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

    .search-input:focus {
      border-color: var(--color-accent-primary, #f5c518);
      background: rgba(255, 255, 255, 0.08);
    }

    .loading, .empty-state, .error-state {
      text-align: center;
      padding: var(--spacing-2xl, 48px);
      color: var(--color-text-secondary, #a0a0a0);
    }

    .empty-state a {
      color: var(--color-accent-primary, #f5c518);
      text-decoration: none;
      font-weight: 600;
    }

    .empty-state a:hover {
      text-decoration: underline;
    }
  `;

  @property({ type: String }) platformSlug: string = '';
  @property({ type: String }) systemSlug: string = '';

  get currentSlug(): string {
    return this.platformSlug || this.systemSlug;
  }

  @state() system: SystemDetail | null = null;
  @state() games: GameRead[] = [];
  @state() loading: boolean = false;
  @state() error: string | null = null;
  @state() filterQuery: string = '';

  override connectedCallback() {
    super.connectedCallback();
    this.fetchSystemData();
    globalThis.addEventListener('roms-updated', this.handleRomsUpdated);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    globalThis.removeEventListener('roms-updated', this.handleRomsUpdated);
  }

  override willUpdate(changedProperties: Map<string, unknown>) {
    if ((changedProperties.has('platformSlug') || changedProperties.has('systemSlug')) && this.currentSlug) {
      this.fetchSystemData();
    }
  }

  handleRomsUpdated = () => {
    this.fetchSystemData();
  };

  async fetchSystemData() {
    const slug = this.currentSlug;
    if (!slug) return;
    try {
      this.loading = true;
      this.error = null;
      const res = await fetch(`/api/platforms/${encodeURIComponent(slug)}`);
      if (!res.ok) {
        if (res.status === 404) {
          this.error = `Platform "${slug}" not found.`;
        } else {
          this.error = `Failed to load platform details (${res.status})`;
        }
        this.system = null;
        this.games = [];
        return;
      }
      const data: SystemDetail = await res.json();
      this.system = data;
      this.games = Array.isArray(data.games) ? data.games : [];
    } catch (e) {
      console.error('Error fetching platform detail:', e);
      this.error = 'Network error while fetching platform data.';
    } finally {
      this.loading = false;
    }
  }

  get filteredGames(): GameRead[] {
    if (!this.filterQuery) return this.games;
    const lowerQ = this.filterQuery.toLowerCase();
    return this.games.filter(g => g.name && g.name.toLowerCase().includes(lowerQ));
  }

  handleFilterInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.filterQuery = input.value;
  }

  override render() {
    return html`
      <div class="system-container">
        <div class="breadcrumb">
          <a href="/">Library</a>
          <span>/</span>
          <span>Platforms</span>
          <span>/</span>
          <span>${this.system?.name || this.currentSlug}</span>
        </div>

        ${when(this.loading, () => html`<div class="loading">Loading platform library...</div>`)}

        ${when(this.error, () => html`
          <div class="error-state">
            <p>${this.error}</p>
            <p><a href="/">Return to Library</a></p>
          </div>
        `)}

        ${when(!this.loading && !this.error && this.system, () => html`
          <div class="system-header">
            <div class="system-title-group">
              <h2>${this.system!.name}</h2>
              <div class="system-meta">
                <span class="badge badge-primary">${this.games.length} ${this.games.length === 1 ? 'Game' : 'Games'}</span>
                ${this.system!.path ? html`<span class="badge badge-path" title="Library Directory">${this.system!.path}</span>` : ''}
              </div>
            </div>
            ${this.games.length > 0 ? html`
              <input 
                type="text" 
                class="search-input" 
                placeholder="Filter ${this.system!.name}..."
                .value=${this.filterQuery}
                @input=${this.handleFilterInput}
              />
            ` : ''}
          </div>

          <div class="games-view">
            ${this.filteredGames.length === 0 ? html`
              <div class="empty-state">
                <p>No games found in this platform collection.</p>
                <p><a href="/add">Scan or import ROMs</a> to populate this platform.</p>
              </div>
            ` : html`
              <app-game-list .games=${this.filteredGames}></app-game-list>
            `}
          </div>
        `)}
      </div>
    `;
  }
}
