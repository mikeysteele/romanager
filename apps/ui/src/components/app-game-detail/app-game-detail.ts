import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '@repo/ui-components';
import { fetchAndValidate, GameReadSchema, type GameRead, type Rom } from '@repo/shared';
import z from "zod";

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function extractYear(dateString?: string | null) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? '' : date.getFullYear().toString();
}

function renderFilesTable(game: GameRead | undefined | null, onDelete: (id: string) => void) {
  if (!game?.platforms?.length) {
    return html`
              <div class="files-section">
                  <h3 class="section-header">Files</h3>
                  <div class="empty-state">No ROMs found mapped to this game.</div>
              </div>
          `;
  }

  return html`
        <div class="files-section">
            <h3 class="section-header">Files</h3>
            <ui-tabs>
                ${game?.platforms.map(platform => html`
                    <ui-tab-panel name="${platform.name}">
                        <table class="files-table">
                            <thead>
                                <tr>
                                    <th>Relative Path</th>
                                    <th>Size</th>
                                    <th>Region</th>
                                    <th>CRC32</th>
                                    <th>MD5</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(platform.roms || []).map((rom: Rom) => html`
                                    <tr>
                                        <td class="filename">${rom.filename}</td>
                                        <td class="size-col">${formatBytes(rom.size)}</td>
                                        <td class="region-col">${rom.region || '-'}</td>
                                        <td>${rom.crc32 ? html`<span class="hash-val">${rom.crc32}</span>` : '-'}</td>
                                        <td>${rom.md5 ? html`<span class="hash-val">${rom.md5}</span>` : '-'}</td>
                                        <td class="actions-cell">
                                            <div style="display: flex; gap: var(--spacing-sm); justify-content: flex-end;">
                                                <ui-button variant="primary" href="/play/${rom.id}">Play / Open</ui-button>
                                                <ui-button variant="error" @click=${() => onDelete(rom.id)}>Delete</ui-button>
                                            </div>
                                        </td>
                                    </tr>
                                `)}
                            </tbody>
                        </table>
                    </ui-tab-panel>
                `)}
            </ui-tabs>
        </div>
      `;
}

function renderHeroBackground(game?: GameRead) {
  if (!game?.backgroundImage) return '';
  return html`
        <div class="hero-background" style="background-image: url('${game.backgroundImage}')"></div>
      `;
}
function renderGameInfo(game: GameRead | undefined | null, year: string) {
  if (!game) return '';
  return html`
        <div class="game-hero">
            <div class="game-cover">
                ${game.backgroundImage
      ? html`<img src="${game.backgroundImage}" alt="${game.name}" />`
      : html`<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#444;font-size:3rem;">🎮</div>`
    }
            </div>
            
            <div class="game-info">
                <div class="title-row">
                    <h1>${game.name}</h1>
                    ${year ? html`<span class="title-year">(${year})</span>` : ''}
                </div>
                
                <div class="meta-badges">
                    ${game.rating ? html`
                       <span class="badge rating-badge">${game.rating}</span>
                    ` : ''}
                </div>

                <div class="meta-grid">
                    <div class="meta-item">
                        <label>Released</label>
                        <span>${game.released || 'Unknown'}</span>
                    </div>
                </div>

                <div class="description">
                    ${game.description
      ? html`<div .innerHTML=${game.description}></div>`
      : 'No description available for this title.'}
                </div>
            </div>
        </div>
      `;
}

@customElement('app-game-detail')
export class AppGameDetail extends LitElement {
  static override styles = css`
    :host {
      display: block;
      width: 100%;
      position: relative;
    }
    
    .hero-background {
      position: absolute;
      top: -var(--spacing-xl); 
      left: -var(--spacing-xl);
      right: -var(--spacing-xl);
      height: 600px;
      background-size: cover;
      background-position: center 20%;
      background-repeat: no-repeat;
      z-index: 0;
      opacity: 0.25;
      mask-image: linear-gradient(to bottom, black 40%, transparent 100%);
      -webkit-mask-image: linear-gradient(to bottom, black 40%, transparent 100%);
    }

    .content-wrapper {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-2xl);
    }

    .header-nav {
      margin-bottom: var(--spacing-sm);
      display: flex;
      align-items: center;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-xs);
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
      text-decoration: none;
      font-weight: var(--font-weight-medium);
      background: rgba(0,0,0,0.5);
      padding: 6px 16px;
      border-radius: var(--border-radius-full);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,0.05);
      transition: all 0.2s ease;
    }
    .back-link:hover {
      color: var(--color-text-primary);
      background: rgba(255,255,255,0.1);
      border-color: rgba(255,255,255,0.2);
    }

    .game-hero {
      display: flex;
      gap: var(--spacing-2xl);
      align-items: flex-start;
      margin-bottom: var(--spacing-xl);
    }

    .game-cover {
      width: 250px;
      flex-shrink: 0;
      border-radius: var(--border-radius-md);
      overflow: hidden;
      box-shadow: 0 8px 30px rgba(0,0,0,0.6);
      border: 1px solid rgba(255,255,255,0.1);
      aspect-ratio: 2/3;
      background: #111;
      position: relative;
    }
    
    .game-cover::after {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        box-shadow: inset 0 0 0 1px rgba(255,255,255,0.1);
        border-radius: var(--border-radius-md);
        pointer-events: none;
    }

    .game-cover img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .game-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
      padding-top: var(--spacing-sm);
    }

    .title-row {
      display: flex;
      align-items: baseline;
      gap: var(--spacing-sm);
      flex-wrap: wrap;
    }

    .title-row h1 {
      margin: 0;
      font-size: 2.75rem;
      font-weight: 700;
      color: #fff;
      line-height: 1.1;
      text-shadow: 0 2px 4px rgba(0,0,0,0.8);
      letter-spacing: -0.5px;
    }

    .title-year {
      font-size: 2rem;
      font-weight: 400;
      color: rgba(255,255,255,0.6);
      text-shadow: 0 2px 4px rgba(0,0,0,0.8);
    }

    .meta-badges {
      display: flex;
      gap: var(--spacing-md);
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: var(--spacing-sm);
    }

    .badge {
      display: inline-flex;
      padding: 3px 10px;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 4px;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--color-text-secondary);
      background: rgba(0,0,0,0.4);
      backdrop-filter: blur(4px);
    }

    .rating-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: bold;
      color: #fff;
    }
    
    .rating-badge::before {
      content: '';
      display: inline-block;
      width: 16px;
      height: 16px;
      background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23f5c518"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>');
    }

    .meta-grid {
      display: flex;
      gap: var(--spacing-2xl);
      margin-bottom: var(--spacing-sm);
      flex-wrap: wrap;
    }

    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .meta-item label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--color-text-tertiary);
    }

    .meta-item span {
      font-size: 0.95rem;
      color: var(--color-text-primary);
      font-weight: 500;
    }

    .description {
      color: var(--color-text-secondary);
      line-height: 1.6;
      font-size: 1.05rem;
      max-width: 900px;
      margin-top: var(--spacing-sm);
      text-shadow: 0 1px 2px rgba(0,0,0,0.6);
    }

    .section-header {
      font-size: 1.5rem;
      font-weight: 500;
      color: var(--color-text-primary);
      margin-bottom: var(--spacing-sm);
    }

    .files-section {
      background: rgba(0, 0, 0, 0.2);
      border-radius: var(--border-radius-md);
      padding: var(--spacing-xl);
      border: 1px solid rgba(255,255,255,0.05);
    }

    .files-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .files-table th {
      color: var(--color-text-tertiary);
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: var(--spacing-md) var(--spacing-sm);
      border-bottom: 2px solid rgba(255,255,255,0.05);
      white-space: nowrap;
    }

    .files-table td {
      padding: var(--spacing-md) var(--spacing-sm);
      border-bottom: 1px solid rgba(255,255,255,0.02);
      color: var(--color-text-secondary);
      font-size: 0.9rem;
      vertical-align: middle;
    }

    .files-table tr:hover td {
      background: rgba(255,255,255,0.03);
      color: var(--color-text-primary);
    }

    .files-table .filename {
      color: var(--color-text-primary);
      font-weight: 500;
      word-break: break-all;
    }

    .files-table .size-col, .files-table .platform-col, .files-table .region-col {
      white-space: nowrap;
    }

    .files-table .hash-val {
      font-family: monospace;
      font-size: 0.85rem;
      background: rgba(0,0,0,0.3);
      padding: 3px 6px;
      border-radius: 4px;
      color: var(--color-text-tertiary);
      border: 1px solid rgba(255,255,255,0.05);
    }

    .actions-cell {
      text-align: right;
    }

    button.primary {
      background: var(--accent-color, #f5c518);
      color: #000;
      padding: 6px 16px;
      border-radius: var(--border-radius-sm);
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    button.primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(245, 197, 24, 0.3);
      background: #f7d147;
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 300px;
      color: var(--color-text-secondary);
      font-size: 1.2rem;
    }
    
    .error {
      color: var(--color-error);
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: var(--border-radius-md);
      padding: var(--spacing-xl);
      text-align: center;
      margin-top: var(--spacing-xl);
    }

    .empty-state {
      padding: var(--spacing-xl) 0;
      text-align: center;
      color: var(--color-text-tertiary);
      font-style: italic;
    }
    
    .attribution {
        text-align: center;
        margin-top: var(--spacing-2xl);
        font-size: var(--font-size-sm);
        color: var(--color-text-tertiary);
    }
    .attribution a {
        color: var(--color-text-secondary);
        text-decoration: none;
    }
    .attribution a:hover {
        color: var(--color-text-primary);
        text-decoration: underline;
    }
    
    .danger-zone {
        margin-left: auto; /* Push to the right if in a flex container */
    }
    
    .checkbox-label {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        margin-top: var(--spacing-md);
        cursor: pointer;
        user-select: none;
    }
    
    .checkbox-label input[type="checkbox"] {
        width: 16px;
        height: 16px;
        cursor: pointer;
    }
  `;

  @property({ type: String }) gameSlug?: string;
  @state() game: GameRead | null = null;
  @state() loading: boolean = false;

  // Delete Modal State
  @state() showDeleteModal: boolean = false;
  @state() deleteFiles: boolean = false;
  @state() deleting: boolean = false;

  override connectedCallback() {
    super.connectedCallback();
    this.checkAndFetch();
  }

  override willUpdate(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('gameSlug')) {
      this.checkAndFetch();
    }
  }

  async checkAndFetch() {
    if (this.gameSlug) {
      await this.fetchGameBySlug(this.gameSlug);
    }
  }



  async fetchGameBySlug(gameSlug: string) {
    try {
      this.loading = true;
      const res = await fetchAndValidate(z.array(GameReadSchema), `/api/games?slug=${gameSlug}`);
      this.game = res[0];
    } catch (e) {
      console.error("Error fetching game by slug", e);
    } finally {
      this.loading = false;
    }
  }

  // Delete Handlers
  openDeleteModal() {
    this.showDeleteModal = true;
    this.deleteFiles = false;
  }

  closeDeleteModal() {
    if (this.deleting) return; // Prevent closing while deleting
    this.showDeleteModal = false;
  }

  async confirmDelete() {
    this.deleting = true;

    try {
      const res = await fetch(`/api/games/${this.game?.id}?deleteFiles=${this.deleteFiles}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete game');
      }

      // Redirect to library after successful deletion
      globalThis.location.href = '/';
    } catch (e) {
      console.error('Failed to delete game', e);
      alert('Failed to delete game');
    } finally {
      this.deleting = false;
      this.showDeleteModal = false;
    }
  }

  async deleteRom(romId: string) {
    if (!confirm("Are you sure you want to delete this file from disk? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/roms/${romId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Failed to dispatch ROM deletion");
      await this.checkAndFetch();
    } catch (e) {
      console.error('Failed to delete ROM', e);
      alert('Failed to delete ROM');
    }
  }

  override render() {
    if (this.loading) {
      return html`<div class="loading">Loading game details...</div>`;
    }

    if (!this.game) {
      return html`<div class="error">Game not found</div>`;
    }

    const year = extractYear(this.game.released);

    return html`
      ${renderHeroBackground()}
      
      <div class="content-wrapper">
        <div class="header-nav">
            <a href="/" class="back-link">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/>
                </svg>
                Library
            </a>
            <div class="danger-zone">
                <ui-button variant="error" size="sm" @click=${this.openDeleteModal}>
                    Delete Game
                </ui-button>
            </div>
        </div>
        
        ${renderGameInfo(this.game, year)}
        ${renderFilesTable(this.game, (id: string) => this.deleteRom(id))}
        
        <div class="attribution">
            Data and images provided by <a href="https://rawg.io/" target="_blank" rel="noopener noreferrer">RAWG Video Games Database</a>.
        </div>
        
        <ui-dialog
            .open=${this.showDeleteModal}
            @ui-dialog-close=${this.closeDeleteModal}
        >
            <h2 slot="header">Delete Game</h2>
            <p>Are you sure you want to delete <strong>${this.game.name}</strong> from your library? This action cannot be undone.</p>
            
            <label class="checkbox-label">
                <input 
                    type="checkbox" 
                    .checked=${this.deleteFiles} 
                    @change=${(e: Event) => this.deleteFiles = (e.target as HTMLInputElement).checked}
                    ?disabled=${this.deleting}
                />
                Also delete mapped ROM files from disk
            </label>

            <div slot="actions">
                <ui-button variant="secondary" @click=${this.closeDeleteModal} ?disabled=${this.deleting}>Cancel</ui-button>
                <ui-button variant="error" @click=${this.confirmDelete} ?disabled=${this.deleting}>
                    ${this.deleting ? 'Deleting...' : 'Delete Game'}
                </ui-button>
            </div>
        </ui-dialog>
      </div>
    `;
  }
}
