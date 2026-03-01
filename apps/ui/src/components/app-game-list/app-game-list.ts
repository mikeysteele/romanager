import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';
import type { GameRead } from '@repo/shared';
import '@repo/ui-components';

@customElement('app-game-list')
export class AppGameList extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }
    .game-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: var(--spacing-lg);
    }
    .game-card-link {
       text-decoration: none;
       color: inherit;
       display: block;
    }
  `;

  @property({ type: Array }) games: GameRead[] = [];


  override render() {
    return html`
      <div class="game-grid">
        ${map(this.games, (game) => html`
            <a href="/game/${game.slug}" class="game-card-link">
              <game-card .game=${game}></game-card>
            </a>
        `)}
      </div>
    `;
  }
}
