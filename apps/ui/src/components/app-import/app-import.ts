import { LitElement, html, css } from 'lit';
import { customElement, state, property, query } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';
import { when } from 'lit/directives/when.js';
import { toast } from '@repo/ui-components';
import '@repo/ui-components';

interface ScannedFile {
    id: string;
    path: string;
    filename: string;
    size: number;
}

interface SearchResult {
    identifier: string;
    title: string;
    description?: string;
    coverUrl?: string;
    year?: string;
    publisher?: string;
    creator?: string;
    platforms?: { id: string; name: string; slug?: string; }[];
}

interface System {
    id: string;
    name: string;
}

@customElement('app-import')
export class AppImport extends LitElement {
    static override styles = css`
        :host {
            display: block;
        }
        h1 {
            color: var(--color-text-primary);
            margin-bottom: var(--spacing-xl);
        }
        .file-list {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-sm);
        }
        .file-item {
            background: var(--color-bg-secondary);
            border: 1px solid var(--border-color);
            padding: var(--spacing-md);
            border-radius: var(--border-radius-md);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .file-info {
            display: flex;
            flex-direction: column;
        }
        .file-path {
            font-size: var(--font-size-sm);
            color: var(--color-text-tertiary);
        }
        .file-name {
            font-weight: 500;
        }
        dialog.import-dialog {
            background: var(--color-bg-primary, #18181f);
            border: 1px solid var(--border-color, rgba(255, 255, 255, 0.12));
            border-radius: var(--border-radius-lg, 12px);
            padding: var(--spacing-xl, 24px);
            width: calc(100% - 32px);
            max-width: 600px;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
            max-height: 90vh;
            overflow-y: auto;
            color: var(--color-text-primary, #fff);
            margin: auto;
        }

        dialog.import-dialog::backdrop {
            background: rgba(0, 0, 0, 0.75);
            backdrop-filter: blur(8px);
        }

        .dialog-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: var(--spacing-lg, 18px);
            padding-bottom: var(--spacing-sm, 10px);
            border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
        }

        .dialog-header h2 {
            margin: 0;
            font-size: 1.25rem;
            color: var(--color-text-primary, #fff);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .dialog-close-btn {
            background: none;
            border: none;
            color: var(--color-text-tertiary, #888);
            font-size: 1.25rem;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            line-height: 1;
            transition: color 0.15s, background-color 0.15s;
        }

        .dialog-close-btn:hover {
            color: var(--color-text-primary, #fff);
            background: rgba(255, 255, 255, 0.1);
        }

        .search-row {
            display: flex;
            gap: var(--spacing-md, 12px);
            margin-top: var(--spacing-md, 16px);
        }

        input[type="search"] {
            flex: 1;
            padding: var(--spacing-md, 12px);
            background: var(--color-bg-tertiary, #111116);
            border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
            border-radius: var(--border-radius-sm, 6px);
            color: var(--color-text-primary, #fff);
        }

        .results-list {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-xs, 4px);
            max-height: 250px;
            overflow-y: auto;
            margin-top: var(--spacing-sm, 8px);
        }

        .result-item {
            padding: var(--spacing-sm, 8px) var(--spacing-md, 12px);
            cursor: pointer;
            border-radius: var(--border-radius-sm, 6px);
            border: 1px solid transparent;
            color: var(--color-text-primary, #ddd);
            transition: all 0.15s;
        }

        .result-item:hover {
            background: var(--color-bg-tertiary, #22222a);
        }

        .result-item.selected {
            border-color: var(--color-accent-primary, #f5c518);
            background: rgba(245, 197, 24, 0.15);
            color: #fff;
        }

        .form-group {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-xs, 6px);
            margin-top: var(--spacing-md, 16px);
        }

        label {
            font-size: var(--font-size-sm, 0.85rem);
            color: var(--color-text-secondary, #aaa);
            font-weight: 600;
        }

        select, input {
            padding: var(--spacing-md, 10px);
            background: var(--color-bg-tertiary, #111116);
            border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
            border-radius: var(--border-radius-sm, 6px);
            color: var(--color-text-primary, #fff);
        }

        .dialog-actions {
            display: flex;
            justify-content: flex-end;
            gap: var(--spacing-md, 12px);
            margin-top: var(--spacing-xl, 24px);
            padding-top: var(--spacing-md, 14px);
            border-top: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
        }

        .group-section {
            background: var(--color-bg-tertiary, #14141a);
            border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
            border-radius: var(--border-radius-md, 8px);
            padding: var(--spacing-md, 12px);
            margin-bottom: var(--spacing-md, 14px);
        }

        .group-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: var(--spacing-xs, 6px);
        }

        .group-header label {
            color: var(--color-text-secondary, #aaa);
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 700;
        }

        .group-file-list {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .group-file-item {
            display: flex;
            align-items: center;
            gap: var(--spacing-sm, 8px);
            padding: 6px 10px;
            background: var(--color-bg-secondary, #1e1e26);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: var(--border-radius-sm, 6px);
            font-size: var(--font-size-sm, 0.85rem);
        }

        .file-ext-badge {
            background: rgba(245, 197, 24, 0.15);
            color: var(--color-accent-primary, #f5c518);
            border: 1px solid rgba(245, 197, 24, 0.3);
            border-radius: 4px;
            padding: 1px 6px;
            font-size: 0.7rem;
            font-weight: 700;
            letter-spacing: 0.5px;
        }

        .file-title {
            flex: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            color: var(--color-text-primary, #fff);
        }

        .file-size {
            color: var(--color-text-tertiary, #888);
            font-size: 0.75rem;
            white-space: nowrap;
        }

        .group-remove-btn {
            background: none;
            border: none;
            color: var(--color-text-tertiary, #888);
            cursor: pointer;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.8rem;
            line-height: 1;
            transition: color 0.15s, background-color 0.15s;
        }

        .group-remove-btn:hover {
            color: #ff5252;
            background: rgba(255, 82, 82, 0.15);
        }

        .companion-box {
            margin-top: var(--spacing-sm, 10px);
            padding-top: var(--spacing-sm, 8px);
            border-top: 1px dashed rgba(255, 255, 255, 0.1);
        }

        .companion-title {
            font-size: 0.75rem;
            color: var(--color-text-tertiary, #aaa);
            margin-bottom: 6px;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .companion-list {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .companion-item {
            display: flex;
            align-items: center;
            gap: var(--spacing-sm, 8px);
            padding: 4px 8px;
            background: rgba(255, 255, 255, 0.03);
            border-radius: var(--border-radius-sm, 4px);
            font-size: var(--font-size-sm, 0.82rem);
        }
    `;

    @query('dialog') private declare dialogEl?: HTMLDialogElement;

    @property({ type: Object }) declare selectedFile: ScannedFile | null;
    @property({ type: Array }) declare selectedFiles: ScannedFile[];
    @property({ type: Array }) declare allUnmappedFiles: ScannedFile[];

    @state() declare groupedFiles: ScannedFile[];
    @state() declare suggestedCompanions: ScannedFile[];
    @state() declare systems: System[];
    @state() declare searchQuery: string;
    @state() declare searchResults: SearchResult[];
    @state() declare selectedGame: SearchResult | null;
    @state() declare selectedSystemId: string;
    @state() declare selectedRegion: string;
    @state() declare activeSearchTab: string;
    @state() declare showAllSystems: boolean;
    
    @state() declare searching: boolean;
    @state() declare importing: boolean;

    constructor() {
        super();
        this.selectedFile = null;
        this.selectedFiles = [];
        this.allUnmappedFiles = [];
        this.groupedFiles = [];
        this.suggestedCompanions = [];
        this.systems = [];
        this.searchQuery = '';
        this.searchResults = [];
        this.selectedGame = null;
        this.selectedSystemId = '';
        this.selectedRegion = '';
        this.activeSearchTab = 'Search RAWG';
        this.showAllSystems = false;
        this.searching = false;
        this.importing = false;
    }

    override connectedCallback() {
        super.connectedCallback();
        this.fetchSystems();
    }
    
    async fetchSystems() {
        try {
            const res = await fetch('/api/metadata/platforms');
            if (res.ok) {
                this.systems = await res.json();
            }
        } catch (e) {
            console.error('Error fetching systems', e);
        }
    }
    
    override willUpdate(changedProperties: Map<string, unknown>) {
        if (changedProperties.has('selectedFile') || changedProperties.has('selectedFiles')) {
            let files: ScannedFile[] = [];
            if (this.selectedFiles && this.selectedFiles.length > 0) {
                files = [...this.selectedFiles];
            } else if (this.selectedFile) {
                files = [this.selectedFile];
            }

            this.groupedFiles = files;
            this.updateSuggestedCompanions();
            if (files.length > 0) {
                this.prepareSearchForFile(files[0]);
            }
        }

        if (changedProperties.has('allUnmappedFiles')) {
            this.updateSuggestedCompanions();
        }
    }
    
    override updated(changedProperties: Map<string, unknown>) {
        if (changedProperties.has('selectedFile') || changedProperties.has('selectedFiles')) {
            if (this.groupedFiles.length > 0) {
                if (this.dialogEl) {
                    if (typeof this.dialogEl.showModal === 'function') {
                        if (!this.dialogEl.open) {
                            this.dialogEl.showModal();
                        }
                    } else {
                        this.dialogEl.open = true;
                    }
                }
            } else {
                if (this.dialogEl && this.dialogEl.open) {
                    if (typeof this.dialogEl.close === 'function') {
                        this.dialogEl.close();
                    } else {
                        this.dialogEl.open = false;
                    }
                }
            }
        }
    }
    
    prepareSearchForFile(file: ScannedFile) {
        // Strip extension
        let guess = file.filename.replace(/\.[^/.]+$/, "");
        // Strip disc/track markers like (Track 1), (Disc 1), (CD1), Disc 1, etc.
        guess = guess.replace(/\s*[\(\[](track|disc|cd|part|side)\s*\d+[\)\]]/gi, "");
        // Strip generic parenthetical metadata like (USA), (Europe), (En,Fr,De), (v1.1), [!], etc.
        guess = guess.replace(/\s*[\(\[][^()]*[\)\]]/g, "");
        this.searchQuery = guess.trim();
        this.handleSearch();
    }

    updateSuggestedCompanions() {
        if (!this.groupedFiles || this.groupedFiles.length === 0 || !this.allUnmappedFiles || this.allUnmappedFiles.length === 0) {
            this.suggestedCompanions = [];
            return;
        }

        const currentIds = new Set(this.groupedFiles.map(f => f.id));
        const primary = this.groupedFiles[0];
        const primaryDir = primary.path.substring(0, primary.path.lastIndexOf('/'));
        
        const sanitizeBase = (name: string) => {
            return name
                .replace(/\.[^/.]+$/, '')
                .replace(/\s*[\(\[](track|disc|cd|part|side)\s*\d+[\)\]]/gi, '')
                .replace(/\s*[\(\[][^()]*[\)\]]/g, '')
                .trim()
                .toLowerCase();
        };

        const primaryBase = sanitizeBase(primary.filename);

        this.suggestedCompanions = this.allUnmappedFiles.filter(f => {
            if (currentIds.has(f.id)) return false;
            const fDir = f.path.substring(0, f.path.lastIndexOf('/'));
            if (fDir !== primaryDir) return false;
            const fBase = sanitizeBase(f.filename);
            return fBase === primaryBase || fBase.startsWith(primaryBase) || primaryBase.startsWith(fBase);
        });
    }

    addFileToGroup(file: ScannedFile) {
        if (!this.groupedFiles.some(f => f.id === file.id)) {
            this.groupedFiles = [...this.groupedFiles, file];
            this.updateSuggestedCompanions();
        }
    }

    removeFileFromGroup(fileId: string) {
        if (this.groupedFiles.length <= 1) return;
        this.groupedFiles = this.groupedFiles.filter(f => f.id !== fileId);
        this.updateSuggestedCompanions();
    }

    handleBackdropClick = (e: MouseEvent) => {
        if (e.target === this.dialogEl) {
            this.closeModal();
        }
    };

    handleDialogClose = () => {
        if (this.groupedFiles.length > 0) {
            this.closeModal();
        }
    };

    closeModal() {
        if (this.dialogEl && this.dialogEl.open) {
            if (typeof this.dialogEl.close === 'function') {
                this.dialogEl.close();
            } else {
                this.dialogEl.open = false;
            }
        }
        this.selectedFile = null;
        this.selectedFiles = [];
        this.groupedFiles = [];
        this.suggestedCompanions = [];
        this.selectedGame = null;
        this.searchResults = [];
        this.searchQuery = '';
        this.selectedRegion = '';
        this.showAllSystems = false;
        this.dispatchEvent(new CustomEvent('import-cancel', { bubbles: true, composed: true }));
    }

    async handleSearch() {
        if (!this.searchQuery) return;
        this.searching = true;
        try {
            if (this.activeSearchTab === 'Search RAWG') {
                const res = await fetch(`/api/metadata/search?q=${encodeURIComponent(this.searchQuery)}`);
                if (res.ok) {
                    const rawgGames = await res.json();
                    this.searchResults = rawgGames.map((g: { id: number | string, name: string, backgroundImage?: string, released?: string, platforms?: Array<{ id?: string | number, name?: string, slug?: string, platform?: { id: number | string, name: string, slug?: string } }> }) => ({
                        identifier: String(g.id),
                        title: g.name,
                        coverUrl: g.backgroundImage,
                        year: g.released?.substring(0, 4) || g.released || 'N/A',
                        platforms: g.platforms ? g.platforms.map(p => ({
                            id: String(p.platform?.id ?? p.id),
                            name: p.platform?.name ?? p.name ?? '',
                            slug: p.platform?.slug ?? p.slug
                        })) : []
                    }));
                }
            } else {
                const res = await fetch(`/api/games?search=${encodeURIComponent(this.searchQuery)}`);
                if (res.ok) {
                    const localGames = await res.json();
                    this.searchResults = localGames.map((g: { id: string, name: string, backgroundImage?: string, released?: string, platforms?: { id: string, name: string, slug?: string }[] }) => ({
                        identifier: g.id,
                        title: g.name,
                        coverUrl: g.backgroundImage,
                        year: g.released?.substring(0, 4) || 'N/A',
                        platforms: g.platforms
                    }));
                }
            }
        } catch (e) {
            console.error('Search failed', e);
        } finally {
            this.searching = false;
        }
    }

    async handleImport() {
        if (this.groupedFiles.length === 0 || !this.selectedSystemId) return;
        
        this.importing = true;
        try {
            const payload: {
                scannedFileIds: string[];
                systemId: string;
                region?: string;
                gameData?: SearchResult;
                gameId?: string;
            } = {
                scannedFileIds: this.groupedFiles.map(f => f.id),
                systemId: this.selectedSystemId,
                region: this.selectedRegion || undefined
            };

            if (this.selectedGame) {
                if (this.selectedGame.identifier.startsWith('game:')) {
                    payload.gameId = this.selectedGame.identifier;
                } else {
                    payload.gameData = this.selectedGame;
                }
            } else {
                toast("Please select a game match.", 'error');
                this.importing = false;
                return;
            }

            const res = await fetch('/api/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const countMsg = this.groupedFiles.length > 1 
                    ? `Game and ${this.groupedFiles.length} files imported successfully`
                    : 'Game imported successfully';
                toast(countMsg, 'success');
                this.dispatchEvent(new CustomEvent('import-complete', { bubbles: true, composed: true }));
                this.closeModal();
            } else {
                const error = await res.json();
                toast(`Failed to import game: ${error.error}`, 'error');
            }
        } catch (e) {
            console.error('Import error', e);
            toast("Import error", 'error');
        } finally {
            this.importing = false;
        }
    }

    override render() {
        let displayedSystems = this.systems;
        let shouldShowAllOption = false;

        if (this.selectedGame?.platforms && this.selectedGame.platforms.length > 0 && !this.showAllSystems) {
            const platformNames = this.selectedGame.platforms.map(p => p.name.toLowerCase());
            displayedSystems = this.systems.filter(sys => {
                const sysName = sys.name.toLowerCase();
                return platformNames.some(pName => sysName.includes(pName) || pName.includes(sysName));
            });
            
            if (this.selectedSystemId && !displayedSystems.some(s => s.id === this.selectedSystemId)) {
                this.selectedSystemId = displayedSystems.length > 0 ? displayedSystems[0].id : '';
            } else if (!this.selectedSystemId && displayedSystems.length > 0) {
                 this.selectedSystemId = displayedSystems[0].id;
            }

            shouldShowAllOption = true;
        }

        return html`
            <dialog class="import-dialog" @click=${this.handleBackdropClick} @close=${this.handleDialogClose}>
                ${when(this.groupedFiles && this.groupedFiles.length > 0, () => html`
                    <div class="dialog-header">
                        <h2>${this.groupedFiles.length > 1 ? `Import Group (${this.groupedFiles.length} files)` : `Import ${this.groupedFiles[0]?.filename || ''}`}</h2>
                        <button class="dialog-close-btn" @click=${this.closeModal} title="Close">✕</button>
                    </div>

                    <div class="group-section">
                        <div class="group-header">
                            <label>Files to Import (${this.groupedFiles.length})</label>
                        </div>
                        <div class="group-file-list">
                            ${map(this.groupedFiles, (f) => {
                                const ext = f.filename.split('.').pop()?.toUpperCase() || 'ROM';
                                const mb = (f.size / (1024 * 1024)).toFixed(2);
                                return html`
                                    <div class="group-file-item">
                                        <span class="file-ext-badge">${ext}</span>
                                        <span class="file-title" title="${f.filename}">${f.filename}</span>
                                        <span class="file-size">${mb} MB</span>
                                        ${this.groupedFiles.length > 1 ? html`
                                            <button class="group-remove-btn" @click=${() => this.removeFileFromGroup(f.id)} title="Remove file from group">✕</button>
                                        ` : ''}
                                    </div>
                                `;
                            })}
                        </div>
                        ${when(this.suggestedCompanions.length > 0, () => html`
                            <div class="companion-box">
                                <div class="companion-title">
                                    <span>Suggested Companions (same folder):</span>
                                </div>
                                <div class="companion-list">
                                    ${map(this.suggestedCompanions, (f) => {
                                        const ext = f.filename.split('.').pop()?.toUpperCase() || 'ROM';
                                        const mb = (f.size / (1024 * 1024)).toFixed(2);
                                        return html`
                                            <div class="companion-item">
                                                <span class="file-ext-badge">${ext}</span>
                                                <span class="file-title" title="${f.filename}">${f.filename}</span>
                                                <span class="file-size">${mb} MB</span>
                                                <ui-button size="sm" variant="secondary" @click=${() => this.addFileToGroup(f)}>
                                                    + Add to Game
                                                </ui-button>
                                            </div>
                                        `;
                                    })}
                                </div>
                            </div>
                        `)}
                    </div>
                    
                    <ui-tabs @tab-changed=${(e: CustomEvent) => { 
                        this.activeSearchTab = e.detail.tab; 
                        this.searchResults = []; 
                        this.selectedGame = null;
                        this.showAllSystems = false;
                        if (this.searchQuery) {
                            this.handleSearch();
                        }
                    }}>
                        <ui-tab-panel name="Search RAWG"></ui-tab-panel>
                        <ui-tab-panel name="Local Library"></ui-tab-panel>
                    </ui-tabs>

                    <div class="search-row">
                        <input 
                            type="search" 
                            .value=${this.searchQuery}
                            @input=${(e: Event) => this.searchQuery = (e.target as HTMLInputElement).value}
                            @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this.handleSearch()}
                            placeholder="Search Game Title..."
                        >
                        <ui-button @click=${this.handleSearch} ?disabled=${this.searching}>
                            ${this.searching ? '...' : 'Search'}
                        </ui-button>
                    </div>

                    ${when(this.searchResults.length > 0, () => html`
                        <div class="results-list">
                            ${map(this.searchResults, (game) => html`
                                <div 
                                    class="result-item ${this.selectedGame?.identifier === game.identifier ? 'selected' : ''}"
                                    @click=${() => {
                                        this.selectedGame = game;
                                        this.showAllSystems = false;
                                    }}
                                >
                                    ${game.title} (${game.year || 'N/A'})
                                </div>
                            `)}
                        </div>
                    `)}

                    <div class="form-group">
                        <label>System</label>
                        <select 
                            .value=${this.selectedSystemId}
                            @change=${(e: Event) => {
                                const val = (e.target as HTMLSelectElement).value;
                                if (val === 'SHOW_ALL') {
                                    this.showAllSystems = true;
                                    this.selectedSystemId = '';
                                } else {
                                    this.selectedSystemId = val;
                                }
                            }}
                        >
                            <option value="">Select System...</option>
                            ${map(displayedSystems, (sys) => html`
                                <option value=${sys.id}>${sys.name}</option>
                            `)}
                            ${when(shouldShowAllOption, () => html`
                                <option value="SHOW_ALL">-- Add a Platform... --</option>
                            `)}
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Region</label>
                        <select 
                            .value=${this.selectedRegion}
                            @change=${(e: Event) => this.selectedRegion = (e.target as HTMLSelectElement).value}
                        >
                            <option value="">Unknown / None</option>
                            <option value="USA">USA</option>
                            <option value="EUR">Europe</option>
                            <option value="JPN">Japan</option>
                            <option value="WLD">World</option>
                        </select>
                    </div>

                    <div class="dialog-actions">
                        <ui-button variant="secondary" @click=${this.closeModal}>Cancel</ui-button>
                        <ui-button variant="primary" @click=${this.handleImport} ?disabled=${this.importing || !this.selectedSystemId || !this.selectedGame || this.groupedFiles.length === 0}>
                            ${this.importing ? 'Importing...' : 'Import'}
                        </ui-button>
                    </div>
                `)}
            </dialog>
        `;
    }
}
