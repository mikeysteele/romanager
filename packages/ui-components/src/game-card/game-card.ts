import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';
import { when } from 'lit/directives/when.js';
import '../ui-badge/ui-badge.ts';

import type { GameRead } from '@repo/shared';

@customElement('game-card')
export class GameCard extends LitElement {
    static override styles = css`
        :host {
       
            background: var(--color-bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--border-radius-md);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            transition: transform var(--transition-fast);
            cursor: pointer;
            position: relative;
            height: 100%;
        }
        :host(:hover) {
            transform: translateY(-4px);
            border-color: var(--color-accent-primary);
        }
        .cover-image {
            width: 100%;
            aspect-ratio: 2/3; /* Standard poster ratio */
            object-fit: cover;
            background: var(--color-bg-tertiary);
        }
        .card-content {
            padding: var(--spacing-md);
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            gap: var(--spacing-xs);
        }
        .game-title {
            font-weight: var(--font-weight-bold);
            font-size: var(--font-size-base);
            margin: 0;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        .game-year {
            color: var(--color-text-tertiary);
            font-size: var(--font-size-sm);
        }
        .platforms-list {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            margin-top: auto;
            padding-top: var(--spacing-sm);
        }
    `;

    @property({ type: Object }) game!: GameRead;

    override render() {
        if (!this.game) return html``;
        
        return html`
                <img class="cover-image" src=${this.game.backgroundImage || '/placeholder.png'} loading="lazy" alt="${this.game.name}">
                <div class="card-content">
                    <h3 class="game-title">${this.game.name}</h3>
                    <span class="game-year">${this.game.released ? this.game.released.substring(0, 4) : ''}</span>
                    
                    ${when(this.game.platforms && this.game.platforms.length > 0, () => html`
                        <div class="platforms-list">
                            ${map(this.game.platforms?.slice(0, 4) || [], p => html`<ui-badge variant="secondary">${p.name}</ui-badge>`)}
                            ${when((this.game.platforms?.length || 0) > 4, () => html`<ui-badge variant="secondary">+${this.game.platforms!.length - 4}</ui-badge>`)}
                        </div>
                    `)}
                </div>
        `;
    }
}
