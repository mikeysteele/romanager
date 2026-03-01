import { LitElement, html, css } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';
import { when } from 'lit/directives/when.js';

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
            border-radius: var(--border-radius-md);
        }

        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(4px);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        .modal {
            background: var(--color-bg-primary);
            border: 1px solid var(--border-color);
            border-radius: var(--border-radius-lg);
            padding: var(--spacing-xl);
            width: 100%;
            max-width: 600px;
            box-shadow: var(--shadow-xl);
            max-height: 90vh;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: var(--spacing-lg);
        }
        .search-row {
            display: flex;
            gap: var(--spacing-md);
        }
        input[type="search"] {
            flex: 1;
            padding: var(--spacing-md);
            background: var(--color-bg-tertiary);
            border: 1px solid var(--border-color);
            border-radius: var(--border-radius-sm);
            color: var(--color-text-primary);
        }
        .results-list {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-xs);
            max-height: 300px;
            overflow-y: auto;
        }
        .result-item {
            padding: var(--spacing-sm);
            cursor: pointer;
            border-radius: var(--border-radius-sm);
            border: 1px solid transparent;
        }
        .result-item:hover {
            background: var(--color-bg-tertiary);
        }
        .result-item.selected {
            border-color: var(--color-accent-primary);
            background: rgba(245, 197, 24, 0.1);
        }
        .form-group {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-xs);
        }
        label {
            font-size: var(--font-size-sm);
            color: var(--color-text-secondary);
        }
        select, input {
            padding: var(--spacing-md);
            background: var(--color-bg-tertiary);
            border: 1px solid var(--border-color);
            border-radius: var(--border-radius-sm);
            color: var(--color-text-primary);
        }
        .modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: var(--spacing-md);
        }
    `;

    @property({ type: Object }) selectedFile: ScannedFile | null = null;
    @state() systems: System[] = [];
    @state() searchQuery: string = '';
    @state() searchResults: SearchResult[] = [];
    @state() selectedGame: SearchResult | null = null;
    @state() selectedSystemId: string = '';
    @state() selectedRegion: string = '';
    @state() activeSearchTab: string = 'Search RAWG';
    @state() showAllSystems: boolean = false;
    
    @state() searching: boolean = false;
    @state() importing: boolean = false;

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
    
    // We want to auto-search whenever a new selectedFile is passed in
    override updated(changedProperties: Map<string, unknown>) {
        if (changedProperties.has('selectedFile') && this.selectedFile) {
            this.prepareSearchForFile(this.selectedFile);
        }
    }
    
    prepareSearchForFile(file: ScannedFile) {
        // Try to guess title from filename
        const guess = file.filename.replace(/\.[^/.]+$/, "").replace(/\s*\(.*?\)/g, "").trim();
        this.searchQuery = guess;
        this.handleSearch();
    }

    closeModal() {
        this.selectedFile = null;
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
                    this.searchResults = rawgGames.map((g: { id: number, name: string, backgroundImage?: string, released?: string, platforms?: { platform: { id: number, name: string, slug?: string } }[] }) => ({
                        identifier: String(g.id),
                        title: g.name,
                        coverUrl: g.backgroundImage,
                        year: g.released,
                        platforms: g.platforms ? g.platforms.map(p => ({
                            id: String(p.platform.id),
                            name: p.platform.name,
                            slug: p.platform.slug
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
        if (!this.selectedFile || !this.selectedSystemId) return;
        
        this.importing = true;
        try {
            const payload: {
                scannedFileId: string;
                systemId: string;
                region?: string;
                gameData?: SearchResult;
                gameId?: string;
            } = {
                scannedFileId: this.selectedFile.id,
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
                alert("Please select a game match.");
                this.importing = false;
                return;
            }

            const res = await fetch('/api/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                this.dispatchEvent(new CustomEvent('import-complete', { bubbles: true, composed: true }));
                this.closeModal();
            } else {
                alert("Import failed.");
            }
        } catch (e) {
            console.error('Import error', e);
            alert("Import error");
        } finally {
            this.importing = false;
        }
    }

    override render() {
        if (!this.selectedFile) return html``;
        
        let displayedSystems = this.systems;
        let shouldShowAllOption = false;

        if (this.selectedGame?.platforms && this.selectedGame.platforms.length > 0 && !this.showAllSystems) {
            const platformNames = this.selectedGame.platforms.map(p => p.name.toLowerCase());
            displayedSystems = this.systems.filter(sys => {
                const sysName = sys.name.toLowerCase();
                return platformNames.some(pName => sysName.includes(pName) || pName.includes(sysName));
            });
            
            // Re-select if the actively chosen system drops out of the filtered view
            if (this.selectedSystemId && !displayedSystems.some(s => s.id === this.selectedSystemId)) {
                this.selectedSystemId = displayedSystems.length > 0 ? displayedSystems[0].id : '';
            } else if (!this.selectedSystemId && displayedSystems.length > 0) {
                 this.selectedSystemId = displayedSystems[0].id;
            }

            shouldShowAllOption = true;
        }

        return html`
                <div class="modal-overlay">
                    <div class="modal">
                        <h2>Import ${this.selectedFile?.filename}</h2>
                        
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

                        <div class="modal-actions">
                            <ui-button variant="secondary" @click=${this.closeModal}>Cancel</ui-button>
                            <ui-button variant="primary" @click=${this.handleImport} ?disabled=${this.importing || !this.selectedSystemId || !this.selectedGame}>
                                ${this.importing ? 'Importing...' : 'Import'}
                            </ui-button>
                        </div>
                    </div>
                </div>
        `;
    }
}
