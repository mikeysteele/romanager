import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { toast } from '@repo/ui-components';
import '@repo/ui-components';

@customElement('app-settings-roms')
export class AppSettingsRoms extends LitElement {
  static override styles = css`
    :host {
        display: block;
        max-width: 860px;
        margin: 0 auto;
        padding-bottom: var(--spacing-2xl, 40px);
    }

    /* Content Cards */
    .cards-stack {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xl, 24px);
    }

    .panel-card {
        background: var(--color-bg-secondary, #18181f);
        border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
        border-radius: var(--border-radius-lg, 12px);
        padding: var(--spacing-xl, 24px);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
        transition: border-color 0.2s;
    }

    .panel-card:hover {
        border-color: rgba(255, 255, 255, 0.14);
    }

    .card-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: var(--spacing-lg, 18px);
        padding-bottom: var(--spacing-md, 14px);
        border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
    }

    .card-icon {
        font-size: 1.3rem;
    }

    .card-title {
        font-size: 1.15rem;
        font-weight: 600;
        color: var(--color-text-primary, #fff);
        margin: 0;
    }

    .form-group {
        margin-bottom: var(--spacing-lg, 20px);
    }

    label {
        display: block;
        margin-bottom: 8px;
        font-weight: 600;
        font-size: 0.9rem;
        color: var(--color-text-primary, #ddd);
    }

    .input-row {
        display: flex;
        gap: var(--spacing-sm, 8px);
        align-items: stretch;
    }

    input[type="text"] {
        flex: 1;
        padding: 10px 14px;
        background: var(--color-bg-tertiary, #111116);
        border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
        border-radius: var(--border-radius-sm, 6px);
        color: var(--color-text-primary, #fff);
        font-size: 0.95rem;
        font-family: monospace;
        transition: border-color 0.15s, box-shadow 0.15s;
    }

    input[type="text"]:focus {
        outline: none;
        border-color: var(--color-accent-primary, #f5c518);
        box-shadow: 0 0 0 2px rgba(245, 197, 24, 0.2);
    }

    .browse-btn {
        background: var(--color-bg-tertiary, #262630);
        color: var(--color-text-primary, #fff);
        border: 1px solid var(--border-color, rgba(255, 255, 255, 0.14));
        border-radius: var(--border-radius-sm, 6px);
        padding: 0 16px;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        white-space: nowrap;
        transition: all 0.15s ease;
    }

    .browse-btn:hover {
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.3);
        transform: translateY(-1px);
    }

    .help-text {
        font-size: 0.85rem;
        color: var(--color-text-tertiary, #888);
        margin-top: 6px;
        line-height: 1.4;
    }

    .card-actions {
        display: flex;
        gap: var(--spacing-md, 12px);
        align-items: center;
        flex-wrap: wrap;
    }

    /* Queue Card Styling */
    .queue-grid {
        display: grid;
        grid-template-columns: 140px 1fr;
        gap: var(--spacing-xl, 24px);
        align-items: center;
    }

    @media (max-width: 600px) {
        .queue-grid {
            grid-template-columns: 1fr;
            text-align: center;
        }
    }

    .stat-badge-box {
        background: var(--color-bg-tertiary, #111116);
        border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
        border-radius: var(--border-radius-md, 8px);
        padding: 16px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }

    .stat-number {
        font-size: 2.25rem;
        font-weight: 800;
        line-height: 1;
        color: var(--color-accent-primary, #f5c518);
        margin-bottom: 4px;
    }

    .stat-label {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--color-text-tertiary, #777);
        font-weight: 600;
    }

    .queue-info-text {
        color: var(--color-text-secondary, #aaa);
        font-size: 0.9rem;
        line-height: 1.5;
        margin: 0 0 var(--spacing-md, 16px) 0;
    }

    .tip-card {
        background: rgba(139, 92, 246, 0.05);
        border: 1px solid rgba(139, 92, 246, 0.15);
        border-radius: var(--border-radius-lg, 12px);
        padding: var(--spacing-lg, 18px) var(--spacing-xl, 24px);
        display: flex;
        gap: var(--spacing-md, 16px);
        align-items: flex-start;
    }

    .tip-icon {
        font-size: 1.25rem;
        flex-shrink: 0;
        margin-top: 2px;
    }

    .tip-content {
        font-size: 0.88rem;
        color: var(--color-text-secondary, #bbb);
        line-height: 1.5;
    }

    .tip-content strong {
        color: var(--color-text-primary, #fff);
    }

    .tip-link {
        color: var(--color-accent-primary, #f5c518);
        text-decoration: none;
        font-weight: 600;
    }

    .tip-link:hover {
        text-decoration: underline;
    }

    .scan-live-container {
        margin-top: var(--spacing-md, 12px);
        padding: 12px 16px;
        background: rgba(245, 197, 24, 0.08);
        border: 1px solid rgba(245, 197, 24, 0.25);
        border-radius: var(--border-radius-md, 8px);
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .scan-live-header {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.9rem;
        color: var(--color-accent-primary, #f5c518);
    }

    .scan-live-spinner {
        display: inline-block;
        animation: spin-icon 1.5s linear infinite;
    }

    @keyframes spin-icon {
        100% { transform: rotate(360deg); }
    }

    .scan-live-count {
        margin-left: auto;
        font-weight: 700;
        background: rgba(245, 197, 24, 0.2);
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.8rem;
    }

    .scan-live-file {
        font-size: 0.8rem;
        color: var(--color-text-secondary, #aaa);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .scan-live-file code {
        color: var(--color-text-primary, #fff);
        font-family: monospace;
    }
  `;

  @state() declare loading: boolean;
  @state() declare romsDir: string;
  @state() declare unmappedCount: number;
  @state() declare isClearing: boolean;
  @state() declare isScanning: boolean;
  @state() declare isBrowserOpen: boolean;
  @state() scanCount: number = 0;
  @state() currentScanFile: string = '';

  constructor() {
    super();
    this.loading = false;
    this.romsDir = '';
    this.unmappedCount = 0;
    this.isClearing = false;
    this.isScanning = false;
    this.isBrowserOpen = false;
    this.scanCount = 0;
    this.currentScanFile = '';
  }

  override connectedCallback() {
      super.connectedCallback();
      this.fetchSettings();
      this.fetchUnmappedCount();
      globalThis.addEventListener('roms-updated', this.handleRomsUpdated);
      globalThis.addEventListener('scan-started', this.handleScanStarted);
      globalThis.addEventListener('scan-progress', this.handleScanProgress as EventListener);
      globalThis.addEventListener('scan-done', this.handleScanDone as EventListener);
      globalThis.addEventListener('scan-error', this.handleScanError as EventListener);
  }

  override disconnectedCallback() {
      super.disconnectedCallback();
      globalThis.removeEventListener('roms-updated', this.handleRomsUpdated);
      globalThis.removeEventListener('scan-started', this.handleScanStarted);
      globalThis.removeEventListener('scan-progress', this.handleScanProgress as EventListener);
      globalThis.removeEventListener('scan-done', this.handleScanDone as EventListener);
      globalThis.removeEventListener('scan-error', this.handleScanError as EventListener);
  }

  handleScanStarted = () => {
      this.isScanning = true;
      this.scanCount = 0;
      this.currentScanFile = '';
  };

  handleScanProgress = (e: CustomEvent<{ count?: number; currentFile?: string }>) => {
      this.isScanning = true;
      if (typeof e.detail?.count === 'number') this.scanCount = e.detail.count;
      if (e.detail?.currentFile) this.currentScanFile = e.detail.currentFile;
  };

  handleScanDone = () => {
      this.isScanning = false;
      this.fetchUnmappedCount();
  };

  handleScanError = () => {
      this.isScanning = false;
  };

  handleRomsUpdated = () => {
      this.fetchUnmappedCount();
  }

  async fetchUnmappedCount() {
    try {
      const res = await fetch('/api/unmapped');
      if (res.ok) {
        const files = await res.json();
        this.unmappedCount = Array.isArray(files) ? files.length : 0;
      }
    } catch (e) {
      console.error('Error fetching unmapped files count', e);
    }
  }

  async fetchSettings() {
    try {
      this.loading = true;
      const res = await fetch('/api/settings');
      if (res.ok) {
        const settings = await res.json();
        const romDirSetting = settings.find((s: { key: string; value: string }) => s.key === 'roms_dir');
        if (romDirSetting) {
          this.romsDir = romDirSetting.value;
        }
      }
    } catch (e) {
      console.error('Error fetching settings', e);
    } finally {
      this.loading = false;
    }
  }

  async saveSettings(e?: Event) {
    if (e) e.preventDefault();
    try {
      this.loading = true;
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'roms_dir', value: this.romsDir }),
      });
      if (res.ok) {
        toast('ROM directory saved. Scan started in background.', 'success');
      } else {
        toast('Error saving settings', 'error');
      }
    } catch (err) {
      console.error('Failed to save settings', err);
      toast('Error saving settings', 'error');
    } finally {
      this.loading = false;
    }
  }

  async clearUnmappedFiles() {
    if (!confirm('Are you sure you want to clear all unmapped files? This will empty the unmapped staging queue so you can rescan cleanly.')) return;
    try {
      this.isClearing = true;
      const res = await fetch('/api/unmapped', { method: 'DELETE' });
      if (res.ok) {
        toast('All unmapped files cleared.', 'success');
        this.unmappedCount = 0;
      } else {
        toast('Failed to clear unmapped files', 'error');
      }
    } catch (err) {
      console.error('Failed to clear unmapped files', err);
      toast('Failed to clear unmapped files', 'error');
    } finally {
      this.isClearing = false;
    }
  }

  async triggerScan() {
    try {
      this.isScanning = true;
      this.scanCount = 0;
      this.currentScanFile = '';
      const res = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: this.romsDir || undefined }),
      });
      if (res.ok) {
        toast('Library scan started in background', 'info');
      } else {
        this.isScanning = false;
        toast('Failed to start scan', 'error');
      }
    } catch (err) {
      this.isScanning = false;
      console.error('Failed to trigger scan', err);
      toast('Failed to start scan', 'error');
    }
  }

  handleFolderSelected = (e: CustomEvent<{ path: string }>) => {
    this.romsDir = e.detail.path;
    this.isBrowserOpen = false;
    toast(`Selected directory: ${this.romsDir}`, 'info');
  };

  override render() {
    return html`
        <ui-page-header
            heading="ROM Management"
            subtitle="Configure your library storage path, manage staged files, and run scanning passes."
            .breadcrumbs=${[
                { label: 'Settings', href: '/settings' },
                { label: 'ROM Management' }
            ]}
        >
            <div slot="actions">
                <ui-button variant="secondary" href="/settings" size="sm">Back to Settings</ui-button>
            </div>
        </ui-page-header>

        <div class="cards-stack">
            <!-- Card 1: Library Path Configuration -->
            <div class="panel-card">
                <div class="card-header">
                    <span class="card-icon">🗂️</span>
                    <h2 class="card-title">ROMs Root Directory</h2>
                </div>

                <form @submit=${(e: SubmitEvent) => this.saveSettings(e)}>
                    <div class="form-group">
                        <label for="roms-dir">Server Filesystem Path</label>
                        <div class="input-row">
                            <input
                                type="text"
                                id="roms-dir"
                                .value=${this.romsDir}
                                @input=${(e: Event) => this.romsDir = (e.target as HTMLInputElement).value}
                                placeholder="/path/to/roms (e.g. /mnt/roms)"
                            />
                            <button type="button" class="browse-btn" @click=${() => this.isBrowserOpen = true}>
                                <span>📁</span> Browse...
                            </button>
                        </div>
                        <div class="help-text">
                            Absolute path on the host system where your console folders (e.g. snes/, gba/, psx/) and ROM files are stored.
                        </div>
                    </div>

                    <div class="card-actions">
                        <ui-button type="submit" variant="primary" ?disabled=${this.loading}>
                            ${this.loading ? 'Saving...' : 'Save & Scan'}
                        </ui-button>
                        <ui-button type="button" variant="secondary" @click=${this.triggerScan} ?disabled=${this.loading || this.isScanning}>
                            ${this.isScanning ? 'Scanning...' : 'Scan Now'}
                        </ui-button>
                    </div>

                    ${this.isScanning ? html`
                      <div class="scan-live-container">
                        <div class="scan-live-header">
                          <span class="scan-live-spinner">⏳</span>
                          <strong>Scanning library in background...</strong>
                          <span class="scan-live-count">${this.scanCount} files discovered</span>
                        </div>
                        ${this.currentScanFile ? html`
                          <div class="scan-live-file" title="${this.currentScanFile}">
                            Current: <code>${this.currentScanFile}</code>
                          </div>
                        ` : ''}
                      </div>
                    ` : ''}
                </form>
            </div>

            <!-- Card 2: Staging & Unmapped Queue -->
            <div class="panel-card">
                <div class="card-header">
                    <span class="card-icon">📥</span>
                    <h2 class="card-title">Unmapped Files Staging Queue</h2>
                </div>

                <div class="queue-grid">
                    <div class="stat-badge-box">
                        <span class="stat-number">${this.unmappedCount}</span>
                        <span class="stat-label">Staged Files</span>
                    </div>

                    <div>
                        <p class="queue-info-text">
                            Files discovered by the scanner are staged in the triage queue before being matched to games in your library. If you updated whitelist rules or reorganized folders, clear this queue to run a clean rescan.
                        </p>

                        <div class="card-actions">
                            <ui-button 
                                variant="error" 
                                @click=${this.clearUnmappedFiles} 
                                ?disabled=${this.isClearing || this.unmappedCount === 0}>
                                ${this.isClearing ? 'Clearing...' : 'Clear Staged Files'}
                            </ui-button>
                            <ui-button variant="secondary" href="/unmapped">
                                View Unmapped Queue (${this.unmappedCount})
                            </ui-button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Card 3: Scanning & Whitelist Tip -->
            <div class="tip-card">
                <span class="tip-icon">💡</span>
                <div class="tip-content">
                    <strong>Scanning Tip:</strong> Romanager automatically skips files that don't match your allowed ROM and BIOS formats. You can customize whitelisted file extensions and header magic numbers in the <a href="/settings/file-types" class="tip-link">File Types Whitelist</a>.
                </div>
            </div>
        </div>

        <!-- Folder Browser Modal Component -->
        <ui-folder-browser
            .open=${this.isBrowserOpen}
            .initialPath=${this.romsDir}
            @folder-selected=${this.handleFolderSelected}
            @ui-folder-browser-close=${() => this.isBrowserOpen = false}
        ></ui-folder-browser>
    `;
  }
}
