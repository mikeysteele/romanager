import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';
import { when } from 'lit/directives/when.js';
import '@repo/ui-components';

import type { Game } from '@repo/shared';

// System interface removed since games don't need system pre-selection on add

@customElement('app-add-game')
export class AppAddGame extends LitElement {
    static override styles = css`
        :host {
            display: block;
        }
        .search-container {
            margin-bottom: var(--spacing-2xl);
            display: flex;
            gap: var(--spacing-md);
        }
        .results-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: var(--spacing-lg);
        }
        .empty-state {
            text-align: center;
            color: var(--color-text-secondary);
            padding: var(--spacing-2xl);
            font-size: var(--font-size-lg);
        }
    `;

    @state() query: string = '';
    @state() results: Game[] = [];
    @state() loading: boolean = false;
    @state() selectedGame: Game | null = null;
    @state() adding: boolean = false;
    @state() success: boolean = false;

    override connectedCallback() {
        super.connectedCallback();
    }

    async handleSearch(e: CustomEvent<{value: string}>) {
        this.query = e.detail.value;
        if (!this.query.trim()) {
            this.results = [];
            return;
        }

        this.loading = true;
        this.results = [];
        
        try {
            const res = await fetch(`/api/metadata/search?q=${encodeURIComponent(this.query)}`);
            if (res.ok) {
                this.results = await res.json();
            }
        } catch (e) {
            console.error('Error searching', e);
        } finally {
            this.loading = false;
        }
    }

    openAddModal(game: Game) {
        this.selectedGame = game;
        this.success = false;
    }

    closeModal() {
        this.selectedGame = null;
        this.success = false;
    }

    async addGame() {
        if (!this.selectedGame) return;
        
        this.adding = true;
        try {
            const res = await fetch('/api/games/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.selectedGame)
            });
            
            if (res.ok) {
                this.success = true;
            } else {
                alert('Failed to add game.');
            }
        } catch (e) {
            console.error('Error adding game', e);
            alert('Error adding game.');
        } finally {
            this.adding = false;
        }
    }

    override render() {
        return html`
            <div class="search-container">
                <ui-search-input 
                    .value=${this.query}
                    .loading=${this.loading}
                    placeholder="Search for games (RAWG)..." 
                    @search=${this.handleSearch}
                ></ui-search-input>
            </div>

            ${when(this.results.length === 0 && !this.loading, () => html`
                <div class="empty-state">
                    Search for a game to add it to your collection.
                </div>
            `)}

            <div class="results-grid">
                ${map(this.results, (game) => html`
                    <game-card 
                        .game=${game} 
                        @click=${() => this.openAddModal(game)}
                    ></game-card>
                `)}
            </div>

            <ui-dialog 
                .open=${this.selectedGame !== null}
                @ui-dialog-close=${this.closeModal}
            >
                ${when(!this.success, () => html`
                    <h2 slot="header">Add "${this.selectedGame?.name}"</h2>
                    <p>Are you sure you want to add this game to your library? You can link ROMs to this game later.</p>

                    <div slot="actions">
                        <ui-button variant="secondary" @click=${this.closeModal}>Cancel</ui-button>
                        <ui-button variant="primary" @click=${this.addGame} ?disabled=${this.adding}>
                            ${this.adding ? 'Adding...' : 'Add Game'}
                        </ui-button>
                    </div>
                `, () => html`
                    <h2 slot="header">Game Added Successfully</h2>
                    <p>"${this.selectedGame?.name}" has been added to your library.</p>
                    
                    <div slot="actions">
                        <ui-button variant="secondary" @click=${this.closeModal}>Close</ui-button>
                        <ui-button variant="primary" href="/game/${this.selectedGame?.slug}">View Game</ui-button>
                    </div>
                `)}
            </ui-dialog>
        `;
    }
}
