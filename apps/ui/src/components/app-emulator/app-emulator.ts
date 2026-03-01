import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { when } from 'lit/directives/when.js';
import type { Rom } from '@repo/shared';

@customElement('app-emulator')
export class AppEmulator extends LitElement {
  static override styles = css`
    :host {
      display: block;
      height: 100%;
      position: fixed; /* Take over the main area */
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 100;
      background: black;
    }
    .emulator-container {
        display: flex;
        flex-direction: column;
        height: 100%;
    }
    .toolbar {
        padding: var(--spacing-sm) var(--spacing-xl);
        background: rgba(0,0,0,0.8);
        backdrop-filter: blur(10px);
        color: var(--color-text-secondary);
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .game-area {
        flex-grow: 1;
        background: #000;
        display: flex;
        justify-content: center;
        align-items: center;
        color: var(--color-text-tertiary);
    }
    .button-link {
        text-decoration: none;
    }
  `;

  @property({ type: String }) gameId?: string;
  @state() rom: Rom | null = null;
  @state() loading: boolean = false;

  override connectedCallback() {
      super.connectedCallback();
      if (this.gameId) {
          this.fetchGame(this.gameId);
      }
  }

  override willUpdate(changedProperties: Map<string, unknown>) {
      if (changedProperties.has('gameId') && this.gameId) {
          this.fetchGame(this.gameId);
      }
  }

  async fetchGame(id: string) {
    try {
      this.loading = true;
      const res = await fetch(`/api/roms/${id}`);
      if (res.ok) {
        this.rom = await res.json();
      }
    } catch (e) {
      console.error('Error fetching rom', e);
    } finally {
      this.loading = false;
    }
  }

  override render() {
    return html`
      <div class="emulator-container">
        ${when(this.loading, () => html`<div class="loading">Loading game...</div>`)}

        ${when(!this.loading && !this.rom, () => html`<div class="error">Game not found</div>`)}

        ${when(!this.loading && !!this.rom, () => html`
            <div class="toolbar">
              <ui-button variant="secondary" size="sm" href="/">Back to Library</ui-button>
              <span>Playing: ${this.rom!.filename}</span>
            </div>
            <div class="game-area">
              <p>Emulator placeholder for ${this.rom!.platform}</p>
            </div>
        `)}
      </div>
    `;
  }
}
