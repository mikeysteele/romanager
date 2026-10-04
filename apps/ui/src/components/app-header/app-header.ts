import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

@customElement('app-header')
export class AppHeader extends LitElement {
  static override styles = css`
    :host {
      display: block;
      width: 100%;
    }
    header {
       height: 64px;
       background: var(--color-bg-glass);
       backdrop-filter: blur(10px);
       border-bottom: 1px solid var(--border-color);
       display: flex;
       align-items: center;
       justify-content: space-between;
       padding: 0 var(--spacing-xl);
       flex-shrink: 0;
    }

    .brand {
      height: 64px;
      display: flex;
      align-items: center;
    }

    .brand h1 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-accent-primary, #f5c518);
      letter-spacing: -0.02em;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .brand h1 a {
      color: inherit;
      text-decoration: none;
    }

    .search-bar {
        display: flex;
        align-items: center;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: var(--border-radius-md, 8px);
        padding: 4px 12px;
        width: 320px;
        color: var(--color-text-secondary, #aaa);
        transition: border-color 0.2s, background 0.2s;
        gap: 8px;
    }

    .search-bar:focus-within {
        border-color: var(--color-accent-primary, #f5c518);
        background: rgba(255, 255, 255, 0.09);
    }

    .search-bar span {
        font-size: 0.85rem;
        user-select: none;
        white-space: nowrap;
    }

    .search-input {
        background: transparent;
        border: none;
        color: #fff;
        font-size: 0.9rem;
        width: 100%;
        outline: none;
    }

    .search-input::placeholder {
        color: rgba(255, 255, 255, 0.35);
    }

    .actions {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .action-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: var(--border-radius-sm, 6px);
        background: rgba(255, 255, 255, 0.05);
        color: var(--color-text-secondary, #ccc);
        text-decoration: none;
        font-size: 0.85rem;
        font-weight: 500;
        border: 1px solid rgba(255, 255, 255, 0.08);
        transition: all 0.15s ease;
    }

    .action-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
        border-color: rgba(255, 255, 255, 0.2);
    }

    .action-btn-primary {
        background: rgba(245, 197, 24, 0.15);
        color: var(--color-accent-primary, #f5c518);
        border-color: rgba(245, 197, 24, 0.3);
    }

    .action-btn-primary:hover {
        background: rgba(245, 197, 24, 0.25);
        color: #fff;
    }

    .scan-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 12px;
        border-radius: 20px;
        background: rgba(245, 197, 24, 0.15);
        color: var(--color-accent-primary, #f5c518);
        border: 1px solid rgba(245, 197, 24, 0.4);
        font-size: 0.8rem;
        font-weight: 600;
        animation: pulse-glow 2s infinite ease-in-out;
        cursor: default;
    }

    .scan-icon-spin {
        display: inline-block;
        animation: spin-icon 1.5s linear infinite;
    }

    @keyframes spin-icon {
        100% { transform: rotate(360deg); }
    }

    @keyframes pulse-glow {
        0%, 100% { opacity: 1; border-color: rgba(245, 197, 24, 0.4); }
        50% { opacity: 0.75; border-color: rgba(245, 197, 24, 0.8); }
    }
  `;

  searchQuery = '';
  @state() isScanning: boolean = false;
  @state() scanCount: number = 0;
  @state() currentScanFile: string = '';

  override connectedCallback() {
    super.connectedCallback();
    globalThis.addEventListener('scan-started', this.handleScanStarted);
    globalThis.addEventListener('scan-progress', this.handleScanProgress as EventListener);
    globalThis.addEventListener('scan-done', this.handleScanDone as EventListener);
    globalThis.addEventListener('scan-error', this.handleScanError as EventListener);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
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
  };

  handleScanError = () => {
    this.isScanning = false;
  };

  handleSearchInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.searchQuery = input.value;
    globalThis.dispatchEvent(new CustomEvent('library-search', {
      detail: { query: this.searchQuery }
    }));
  }

  handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      if (typeof globalThis.location !== 'undefined' && globalThis.location.pathname !== '/') {
        globalThis.location.href = `/?search=${encodeURIComponent(this.searchQuery)}`;
      }
    }
  }

  override render() {
    return html`
    <header class="top-bar">
      <div class="brand">
        <h1><a href="/">Romanager</a></h1>
      </div> 
      <div class="search-bar">
        <span>🔍 Search:</span>
        <input 
          type="text" 
          class="search-input" 
          placeholder="Filter collection..." 
          .value=${this.searchQuery}
          @input=${this.handleSearchInput}
          @keydown=${this.handleKeyDown}
        />
      </div>
      <div class="actions">
        ${this.isScanning ? html`
          <div class="scan-badge" title="${this.currentScanFile ? `Scanning: ${this.currentScanFile}` : 'Scanning library in background...'}">
            <span class="scan-icon-spin">⏳</span>
            <span>Scanning (${this.scanCount})</span>
          </div>
        ` : ''}
        <a href="/add" class="action-btn action-btn-primary" title="Add or scan new games">
          <span>+ Add Games</span>
        </a>
        <a href="/settings" class="action-btn" title="System Settings">
          <span>⚙️ Settings</span>
        </a>
      </div>
    </header>
    `;
  }
}
