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
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1000;
      background: #0d0d11;
      color: #e0e0e0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .emulator-container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .toolbar {
      padding: 10px 24px;
      background: rgba(18, 18, 24, 0.95);
      backdrop-filter: blur(12px);
      color: var(--color-text-secondary, #aaa);
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      z-index: 10;
    }

    .toolbar-left, .toolbar-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .rom-title {
      font-weight: 600;
      color: #fff;
      font-size: 0.95rem;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .platform-pill {
      background: rgba(245, 197, 24, 0.15);
      color: var(--color-accent-primary, #f5c518);
      border: 1px solid rgba(245, 197, 24, 0.3);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      text-transform: uppercase;
      font-weight: 700;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
      text-decoration: none;
      font-size: 0.85rem;
      font-weight: 500;
      border: 1px solid rgba(255, 255, 255, 0.12);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn:hover {
      background: rgba(255, 255, 255, 0.15);
      border-color: rgba(255, 255, 255, 0.25);
    }

    .game-area {
      flex-grow: 1;
      background: radial-gradient(circle at center, #1a1a24 0%, #0a0a0f 100%);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      position: relative;
      overflow: hidden;
      padding: 24px;
    }

    .crt-monitor {
      width: 100%;
      max-width: 900px;
      aspect-ratio: 4 / 3;
      background: #000;
      border-radius: 16px;
      box-shadow: 0 0 50px rgba(0, 0, 0, 0.9), 0 0 20px rgba(245, 197, 24, 0.05);
      border: 4px solid #2a2a35;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }

    /* Scanlines effect */
    .crt-monitor::after {
      content: " ";
      display: block;
      position: absolute;
      top: 0; left: 0; bottom: 0; right: 0;
      background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03));
      z-index: 2;
      background-size: 100% 3px, 6px 100%;
      pointer-events: none;
    }

    .crt-content {
      z-index: 1;
      text-align: center;
      padding: 32px;
      max-width: 500px;
    }

    .arcade-logo {
      font-size: 2.5rem;
      margin-bottom: 12px;
    }

    .crt-hud {
      position: absolute;
      top: 16px;
      left: 20px;
      right: 20px;
      display: flex;
      justify-content: space-between;
      font-family: monospace;
      font-size: 0.8rem;
      color: #39ff14;
      text-shadow: 0 0 8px rgba(57, 255, 20, 0.6);
      z-index: 3;
    }

    .crt-instructions {
      margin-top: 20px;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      background: rgba(255, 255, 255, 0.04);
      padding: 14px 20px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 0.85rem;
      text-align: left;
    }

    .key-badge {
      display: inline-block;
      padding: 2px 6px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.75rem;
      margin-right: 6px;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .loading, .error {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      font-size: 1.2rem;
      color: #aaa;
    }
  `;

  @property({ type: String }) gameId?: string;
  @state() rom: Rom | null = null;
  @state() loading: boolean = false;
  @state() isMuted: boolean = false;
  @state() isPaused: boolean = false;

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

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      this.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  togglePause() {
    this.isPaused = !this.isPaused;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
  }

  override render() {
    return html`
      <div class="emulator-container">
        ${when(this.loading, () => html`<div class="loading">Loading ROM core...</div>`)}

        ${when(!this.loading && !this.rom, () => html`<div class="error">ROM not found or unmapped.</div>`)}

        ${when(!this.loading && !!this.rom, () => html`
          <div class="toolbar">
            <div class="toolbar-left">
              <a class="btn" href="/">← Back to Library</a>
              <span class="rom-title">
                Playing: ${this.rom!.filename}
                <span class="platform-pill">${this.rom!.platform || 'RAW'}</span>
              </span>
            </div>
            <div class="toolbar-right">
              <button class="btn" @click=${this.togglePause}>
                ${this.isPaused ? '▶ Resume' : '⏸ Pause'}
              </button>
              <button class="btn" @click=${this.toggleMute}>
                ${this.isMuted ? '🔇 Unmute' : '🔊 Sound'}
              </button>
              <button class="btn" @click=${this.toggleFullscreen}>
                ⛶ Fullscreen
              </button>
            </div>
          </div>

          <div class="game-area">
            <div class="crt-monitor">
              <div class="crt-hud">
                <span>CORE: ${String(this.rom!.platform || 'GENERIC').toUpperCase()}</span>
                <span>FPS: ${this.isPaused ? '0.0 (PAUSED)' : '60.0'}</span>
              </div>

              <div class="crt-content">
                <div class="arcade-logo">🎮</div>
                <h3 style="margin: 0 0 8px 0; color: #fff;">${this.rom!.filename}</h3>
                <p style="margin: 0; color: #888; font-size: 0.9rem;">
                  WASM RetroArch / Libretro Core Ready
                </p>

                <div class="crt-instructions">
                  <div><span class="key-badge">▲▼◄►</span> D-Pad</div>
                  <div><span class="key-badge">Z / X</span> B / A Action</div>
                  <div><span class="key-badge">ENTER</span> Start</div>
                  <div><span class="key-badge">R-SHIFT</span> Select</div>
                </div>
              </div>
            </div>
          </div>
        `)}
      </div>
    `;
  }
}
