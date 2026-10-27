import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { when } from 'lit/directives/when.js';
import { Nostalgist } from 'nostalgist';
import {
  LIBRETRO_WASM_CORES,
  getDefaultEmulatorConfig,
  type Rom,
  type SystemFirmware,
  type Platform,
} from '@repo/shared';

type RomWithSystem = Rom & {
  system?: (Platform & { firmware?: SystemFirmware[] }) | null;
  firmware?: SystemFirmware[];
};

const EXT_TO_CORE: Record<string, string> = {
  '.nes': 'fceumm',
  '.fds': 'fceumm',
  '.sfc': 'snes9x',
  '.smc': 'snes9x',
  '.gb': 'gambatte',
  '.gbc': 'gambatte',
  '.gba': 'mgba',
  '.md': 'genesis_plus_gx',
  '.gen': 'genesis_plus_gx',
  '.smd': 'genesis_plus_gx',
  '.sms': 'genesis_plus_gx',
  '.gg': 'genesis_plus_gx',
  '.32x': 'picodrive',
  '.pce': 'mednafen_pce_fast',
  '.sgx': 'geargrafx',
  '.ngp': 'mednafen_ngp',
  '.ngc': 'mednafen_ngp',
  '.ws': 'mednafen_wswan',
  '.wsc': 'mednafen_wswan',
  '.vb': 'mednafen_vb',
  '.vboy': 'mednafen_vb',
  '.lnx': 'handy',
  '.col': 'gearcoleco',
  '.vec': 'vecx',
  '.cue': 'pcsx_rearmed',
  '.chd': 'pcsx_rearmed',
  '.pbp': 'pcsx_rearmed',
  '.iso': 'pcsx_rearmed',
  '.zip': 'fbneo',
};

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
      gap: 12px;
      flex-wrap: wrap;
    }

    .toolbar-left, .toolbar-right {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
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
      padding: 6px 12px;
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

    .btn:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.15);
      border-color: rgba(255, 255, 255, 0.25);
    }

    .btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .btn-primary {
      background: var(--color-accent-primary, #f5c518);
      color: #000;
      border-color: var(--color-accent-primary, #f5c518);
      font-weight: 700;
    }

    .btn-primary:hover:not(:disabled) {
      background: #f7d147;
      border-color: #f7d147;
    }

    .btn-launch {
      margin-top: 18px;
      padding: 12px 28px;
      font-size: 1rem;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(245, 197, 24, 0.3);
    }

    .core-select {
      padding: 6px 10px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.15);
      font-size: 0.82rem;
    }

    .core-select option {
      background: #181820;
      color: #fff;
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
      padding: 20px;
    }

    .crt-monitor {
      width: 100%;
      max-width: 960px;
      max-height: calc(100vh - 110px);
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

    .emulator-canvas {
      width: 100%;
      height: 100%;
      display: block;
      outline: none;
      image-rendering: pixelated;
    }

    /* Scanlines effect */
    .crt-monitor::after {
      content: " ";
      display: block;
      position: absolute;
      top: 0; left: 0; bottom: 0; right: 0;
      background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.2) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.02), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.02));
      z-index: 2;
      background-size: 100% 3px, 6px 100%;
      pointer-events: none;
    }

    .crt-overlay {
      position: absolute;
      inset: 0;
      z-index: 3;
      background: rgba(10, 10, 15, 0.92);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 32px;
    }

    .crt-content {
      max-width: 520px;
    }

    .arcade-logo {
      font-size: 2.5rem;
      margin-bottom: 12px;
    }

    .crt-hud {
      position: absolute;
      top: 12px;
      left: 16px;
      right: 16px;
      display: flex;
      justify-content: space-between;
      font-family: monospace;
      font-size: 0.78rem;
      color: #39ff14;
      text-shadow: 0 0 8px rgba(57, 255, 20, 0.6);
      z-index: 4;
      pointer-events: none;
      opacity: 0.85;
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

    .status-msg {
      margin-top: 12px;
      color: var(--color-accent-primary, #f5c518);
      font-size: 0.9rem;
    }

    .error-box {
      margin-top: 16px;
      padding: 12px 16px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      border-radius: 8px;
      color: #fca5a5;
      font-size: 0.85rem;
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
  @state() rom: RomWithSystem | null = null;
  @state() loading: boolean = false;
  @state() isMuted: boolean = false;
  @state() isPaused: boolean = false;
  @state() emulatorStatus: 'idle' | 'loading' | 'running' | 'error' = 'idle';
  @state() statusMessage: string = '';
  @state() errorMessage: string | null = null;
  @state() selectedCore: string = '';
  @state() savedStateBlob: Blob | null = null;

  private nostalgist: Nostalgist | null = null;
  private abortController: AbortController | null = null;
  private resizeObserver: ResizeObserver | null = null;

  override connectedCallback() {
    super.connectedCallback();
    if (this.gameId) {
      this.fetchGame(this.gameId);
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.cleanupEmulator();
  }

  override willUpdate(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('gameId') && this.gameId) {
      this.cleanupEmulator();
      this.fetchGame(this.gameId);
    }
  }

  private cleanupEmulator() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.nostalgist) {
      try {
        this.nostalgist.exit({ removeCanvas: false });
      } catch (e) {
        console.warn('Error exiting Nostalgist instance:', e);
      }
      this.nostalgist = null;
    }
    this.emulatorStatus = 'idle';
    this.isPaused = false;
  }

  private inferCoreForRom(rom: RomWithSystem | null): string {
    if (!rom) return 'fceumm';
    if (rom.emulatorCore) return rom.emulatorCore;
    if (rom.system?.emulatorCore) return rom.system.emulatorCore;

    const defaults = getDefaultEmulatorConfig(
      rom.system?.slug || rom.platform,
      rom.system?.esFolder || rom.system?.path
    );
    if (defaults.emulatorCore) return defaults.emulatorCore;

    const fname = (rom.launchFile || rom.filename || '').toLowerCase();
    const dotIdx = fname.lastIndexOf('.');
    if (dotIdx !== -1) {
      const ext = fname.slice(dotIdx);
      if (EXT_TO_CORE[ext]) return EXT_TO_CORE[ext];
    }
    return 'fceumm';
  }

  private isRomEmulatable(rom: RomWithSystem | null): boolean {
    if (!rom) return false;
    if (rom.emulatable !== undefined) return Boolean(rom.emulatable);
    if (rom.system?.emulatable !== undefined) return Boolean(rom.system.emulatable);
    const defaults = getDefaultEmulatorConfig(
      rom.system?.slug || rom.platform,
      rom.system?.esFolder || rom.system?.path
    );
    return defaults.emulatable;
  }

  async fetchGame(id: string) {
    try {
      this.loading = true;
      this.errorMessage = null;
      const res = await fetch(`/api/roms/${id}`);
      if (res.ok) {
        const data: RomWithSystem = await res.json();
        this.rom = data;
        this.selectedCore = this.inferCoreForRom(data);
      } else {
        this.rom = null;
      }
    } catch (e) {
      console.error('Error fetching rom', e);
      this.rom = null;
    } finally {
      this.loading = false;
    }
  }

  async startEmulator() {
    if (!this.rom || this.emulatorStatus === 'loading') return;

    this.cleanupEmulator();
    this.emulatorStatus = 'loading';
    this.errorMessage = null;
    this.statusMessage = 'Downloading ROM file...';

    const abortController = new AbortController();
    this.abortController = abortController;

    try {
      await this.updateComplete;
      const canvas = this.shadowRoot?.querySelector('canvas.emulator-canvas') as HTMLCanvasElement | null;
      if (!canvas) {
        throw new Error('Emulator canvas element not found.');
      }

      const core = this.selectedCore || this.inferCoreForRom(this.rom);

      // Prepare ROM file(s)
      const romInputs: Array<{ fileName: string; fileContent: Blob }> = [];
      const files = this.rom.files || [];
      if (files.length > 1) {
        const sortedFiles = [...files].sort((a, b) => {
          if (a.role === 'launch' && b.role !== 'launch') return -1;
          if (b.role === 'launch' && a.role !== 'launch') return 1;
          return 0;
        });
        for (const f of sortedFiles) {
          this.statusMessage = `Downloading ${f.filename || f.relPath}...`;
          const res = await fetch(`/api/roms/${this.rom.id}/files/${f.id}`, {
            signal: abortController.signal,
          });
          if (!res.ok) {
            throw new Error(`Failed to fetch ROM file "${f.filename || f.relPath}" (HTTP ${res.status})`);
          }
          const blob = await res.blob();
          romInputs.push({
            fileName: f.filename || f.relPath || this.rom.filename,
            fileContent: blob,
          });
        }
      } else {
        const res = await fetch(`/api/roms/${this.rom.id}/file`, {
          signal: abortController.signal,
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error || `Failed to download ROM file (HTTP ${res.status})`);
        }
        const blob = await res.blob();
        const launchName = this.rom.launchFile || this.rom.filename || 'game.rom';
        romInputs.push({
          fileName: launchName.split('/').pop() || launchName,
          fileContent: blob,
        });
      }

      // Prepare mapped BIOS / Firmware files if any exist for this platform
      const firmwareList = this.rom.firmware || this.rom.system?.firmware || [];
      const biosInputs: Array<{ fileName: string; fileContent: Blob }> = [];
      for (const fw of firmwareList) {
        this.statusMessage = `Loading BIOS ${fw.filename}...`;
        const fwRes = await fetch(`/api/firmware/${fw.id}/file`, {
          signal: abortController.signal,
        });
        if (fwRes.ok) {
          biosInputs.push({
            fileName: fw.filename,
            fileContent: await fwRes.blob(),
          });
        }
      }

      this.statusMessage = `Initializing Libretro WASM core (${core})...`;

      const nostalgist = await Nostalgist.launch({
        element: canvas,
        core,
        rom: romInputs,
        ...(biosInputs.length > 0 ? { bios: biosInputs } : {}),
        signal: abortController.signal,
        respondToGlobalEvents: true,
        style: {
          width: '100%',
          height: '100%',
          display: 'block',
          backgroundColor: 'black',
          imageRendering: 'pixelated',
        },
      });

      this.nostalgist = nostalgist;
      this.emulatorStatus = 'running';
      this.isPaused = false;
      this.statusMessage = '';
      canvas.focus();

      const monitor = this.shadowRoot?.querySelector('.crt-monitor');
      if (monitor && typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const { width, height } = entry.contentRect;
            if (width > 0 && height > 0 && this.nostalgist) {
              try {
                this.nostalgist.resize({ width: Math.round(width), height: Math.round(height) });
              } catch {
                // Ignore resize errors during teardown
              }
            }
          }
        });
        this.resizeObserver.observe(monitor);
      }
    } catch (e: unknown) {
      if (abortController.signal.aborted) return;
      console.error('Failed to launch WASM Libretro emulator:', e);
      this.emulatorStatus = 'error';
      this.errorMessage = e instanceof Error ? e.message : String(e);
    }
  }

  toggleFullscreen() {
    const monitor = this.shadowRoot?.querySelector('.crt-monitor') as HTMLElement | null;
    const target = monitor || this;
    if (!document.fullscreenElement) {
      target.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  togglePause() {
    if (!this.nostalgist || this.emulatorStatus !== 'running') {
      this.isPaused = !this.isPaused;
      return;
    }
    if (this.isPaused) {
      this.nostalgist.resume();
      this.isPaused = false;
    } else {
      this.nostalgist.pause();
      this.isPaused = true;
    }
  }

  restartGame() {
    if (!this.nostalgist || this.emulatorStatus !== 'running') return;
    this.nostalgist.restart();
    this.isPaused = false;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.nostalgist && this.emulatorStatus === 'running') {
      try {
        this.nostalgist.sendCommand('MUTE');
      } catch (e) {
        console.warn('Failed to toggle mute command:', e);
      }
      try {
        const al = this.nostalgist.getEmscriptenAL();
        const contexts = al?.contexts ? Object.values(al.contexts) : [];
        for (const ctx of contexts as Array<{ audioCtx?: AudioContext; gain?: GainNode }>) {
          if (ctx?.gain?.gain) {
            ctx.gain.gain.value = this.isMuted ? 0 : 1;
          } else if (ctx?.audioCtx) {
            if (this.isMuted) ctx.audioCtx.suspend?.();
            else ctx.audioCtx.resume?.();
          }
        }
      } catch {
        // Fallback to RetroArch MUTE command only
      }
    }
  }

  async handleSaveState() {
    if (!this.nostalgist || this.emulatorStatus !== 'running') return;
    try {
      const { state } = await this.nostalgist.saveState();
      this.savedStateBlob = state;
    } catch (e) {
      console.error('Failed to save state:', e);
    }
  }

  async handleLoadState() {
    if (!this.nostalgist || this.emulatorStatus !== 'running' || !this.savedStateBlob) return;
    try {
      await this.nostalgist.loadState(this.savedStateBlob);
    } catch (e) {
      console.error('Failed to load state:', e);
    }
  }

  async handleScreenshot() {
    if (!this.nostalgist || this.emulatorStatus !== 'running') return;
    try {
      const blob = await this.nostalgist.screenshot();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(this.rom?.filename || 'screenshot').replace(/\.[^.]+$/, '')}-screenshot.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to capture screenshot:', e);
    }
  }

  handleCoreChange(e: Event) {
    const newCore = (e.target as HTMLSelectElement).value;
    this.selectedCore = newCore;
    if (this.emulatorStatus === 'running') {
      this.startEmulator();
    }
  }

  override render() {
    const canEmulate = this.isRomEmulatable(this.rom);
    const activeCore = this.selectedCore || this.inferCoreForRom(this.rom);

    return html`
      <div class="emulator-container">
        ${when(this.loading, () => html`<div class="loading">Loading ROM metadata...</div>`)}

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
              <select
                class="core-select"
                title="Libretro WASM Core"
                .value=${activeCore}
                @change=${this.handleCoreChange}
              >
                ${LIBRETRO_WASM_CORES.map(c => html`
                  <option value=${c.id} ?selected=${activeCore === c.id}>
                    Core: ${c.name} (${c.id})
                  </option>
                `)}
              </select>

              ${this.emulatorStatus !== 'running' ? html`
                <button
                  class="btn btn-primary"
                  ?disabled=${!canEmulate || this.emulatorStatus === 'loading'}
                  @click=${this.startEmulator}
                >
                  ${this.emulatorStatus === 'loading' ? '⏳ Starting...' : '▶ Start Game'}
                </button>
              ` : html`
                <button class="btn" @click=${this.togglePause}>
                  ${this.isPaused ? '▶ Resume' : '⏸ Pause'}
                </button>
                <button class="btn" @click=${this.restartGame}>
                  ↺ Reset
                </button>
                <button class="btn" @click=${this.handleSaveState}>
                  💾 Save State
                </button>
                <button class="btn" ?disabled=${!this.savedStateBlob} @click=${this.handleLoadState}>
                  📂 Load State
                </button>
                <button class="btn" @click=${this.handleScreenshot}>
                  📷 Screenshot
                </button>
              `}

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
                <span>CORE: ${activeCore.toUpperCase()} (${String(this.rom!.platform || 'GENERIC').toUpperCase()})</span>
                <span>STATUS: ${this.emulatorStatus === 'running' ? (this.isPaused ? 'PAUSED' : 'RUNNING 60FPS') : this.emulatorStatus.toUpperCase()}</span>
              </div>

              <canvas class="emulator-canvas" tabindex="0"></canvas>

              ${this.emulatorStatus !== 'running' ? html`
                <div class="crt-overlay">
                  <div class="crt-content">
                    <div class="arcade-logo">🎮</div>
                    <h3 style="margin: 0 0 8px 0; color: #fff;">${this.rom!.filename}</h3>

                    ${!canEmulate ? html`
                      <div class="error-box">
                        Browser emulation is currently disabled for <strong>${this.rom!.platform}</strong>.
                        <div style="margin-top: 10px;">
                          <a class="btn" href="/settings/platforms">Configure in Platforms &amp; Firmware</a>
                        </div>
                      </div>
                    ` : html`
                      <p style="margin: 0; color: #aaa; font-size: 0.9rem;">
                        Libretro WASM Core: <strong>${activeCore}</strong>
                      </p>

                      ${this.emulatorStatus === 'loading' ? html`
                        <div class="status-msg">⏳ ${this.statusMessage || 'Loading emulator...'}</div>
                      ` : html`
                        <button class="btn btn-primary btn-launch" @click=${this.startEmulator}>
                          ▶ Launch Game
                        </button>
                      `}

                      ${this.errorMessage ? html`
                        <div class="error-box">
                          <strong>Failed to start emulator:</strong> ${this.errorMessage}
                        </div>
                      ` : ''}
                    `}

                    <div class="crt-instructions">
                      <div><span class="key-badge">▲▼◄►</span> D-Pad</div>
                      <div><span class="key-badge">Z / X</span> B / A Action</div>
                      <div><span class="key-badge">A / S</span> Y / X Action</div>
                      <div><span class="key-badge">Q / W</span> L / R Shoulder</div>
                      <div><span class="key-badge">ENTER</span> Start</div>
                      <div><span class="key-badge">R-SHIFT</span> Select</div>
                    </div>
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        `)}
      </div>
    `;
  }
}
