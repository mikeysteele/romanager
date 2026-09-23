import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';
import { when } from 'lit/directives/when.js';

interface DirectoryItem {
    name: string;
    path: string;
}

interface ShortcutItem {
    label: string;
    path: string;
}

interface BrowseResponse {
    currentPath: string;
    parentPath: string | null;
    directories: DirectoryItem[];
    shortcuts: ShortcutItem[];
}

@customElement('ui-folder-browser')
export class UiFolderBrowser extends LitElement {
    static override styles = css`
        :host {
            display: contents;
        }

        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.75);
            backdrop-filter: blur(8px);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1100;
        }

        .browser-dialog {
            background: var(--color-bg-primary, #0f0f15);
            border: 1px solid var(--border-color, rgba(255, 255, 255, 0.12));
            border-radius: var(--border-radius-lg, 12px);
            width: 100%;
            max-width: 680px;
            height: 560px;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
            overflow: hidden;
            animation: fadeIn 0.15s ease-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.98); }
            to { opacity: 1; transform: scale(1); }
        }

        .header {
            padding: var(--spacing-md, 16px) var(--spacing-lg, 20px);
            border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: var(--color-bg-glass, rgba(24, 24, 27, 0.7));
        }

        .header-title {
            font-size: var(--font-size-lg, 1.125rem);
            font-weight: var(--font-weight-bold, 700);
            color: var(--color-text-primary, #fff);
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 0;
        }

        .close-btn {
            background: none;
            border: none;
            color: var(--color-text-tertiary, #888);
            font-size: 1.25rem;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            transition: color 0.15s, background-color 0.15s;
        }

        .close-btn:hover {
            color: var(--color-text-primary, #fff);
            background: rgba(255, 255, 255, 0.1);
        }

        .shortcuts-bar {
            display: flex;
            gap: 6px;
            padding: 10px var(--spacing-lg, 20px);
            background: rgba(0, 0, 0, 0.3);
            border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.05));
            overflow-x: auto;
            white-space: nowrap;
        }

        .shortcut-chip {
            background: var(--color-bg-secondary, #222);
            color: var(--color-text-secondary, #ccc);
            border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
            border-radius: var(--border-radius-full, 9999px);
            padding: 3px 12px;
            font-size: 0.78rem;
            cursor: pointer;
            transition: all 0.15s;
        }

        .shortcut-chip:hover {
            background: var(--color-accent-primary, #8b5cf6);
            color: #fff;
            border-color: var(--color-accent-primary, #8b5cf6);
        }

        .nav-bar {
            padding: var(--spacing-sm, 10px) var(--spacing-lg, 20px);
            display: flex;
            gap: var(--spacing-sm, 8px);
            align-items: center;
            border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
        }

        .nav-btn {
            background: var(--color-bg-tertiary, #2a2a32);
            color: var(--color-text-primary, #fff);
            border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
            border-radius: var(--border-radius-sm, 6px);
            padding: 6px 12px;
            font-size: 0.85rem;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            transition: all 0.15s;
        }

        .nav-btn:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.15);
        }

        .nav-btn:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }

        .path-input {
            flex: 1;
            background: var(--color-bg-tertiary, #1b1b22);
            border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
            border-radius: var(--border-radius-sm, 6px);
            padding: 7px 12px;
            color: var(--color-text-primary, #fff);
            font-family: monospace;
            font-size: 0.85rem;
        }

        .path-input:focus {
            outline: none;
            border-color: var(--color-accent-primary, #8b5cf6);
            box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.25);
        }

        .filter-row {
            padding: 6px var(--spacing-lg, 20px);
            background: rgba(0, 0, 0, 0.15);
            border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.05));
        }

        .filter-input {
            width: 100%;
            background: transparent;
            border: none;
            color: var(--color-text-primary, #fff);
            font-size: 0.85rem;
            padding: 4px 0;
        }

        .filter-input::placeholder {
            color: var(--color-text-tertiary, #666);
        }

        .filter-input:focus {
            outline: none;
        }

        .folder-list {
            flex: 1;
            overflow-y: auto;
            padding: var(--spacing-sm, 8px) var(--spacing-md, 12px);
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .folder-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            border-radius: var(--border-radius-sm, 6px);
            cursor: pointer;
            user-select: none;
            transition: background-color 0.1s;
            border: 1px solid transparent;
        }

        .folder-item:hover {
            background: rgba(255, 255, 255, 0.06);
        }

        .folder-item.selected {
            background: rgba(139, 92, 246, 0.18);
            border-color: rgba(139, 92, 246, 0.4);
        }

        .folder-info {
            display: flex;
            align-items: center;
            gap: 10px;
            color: var(--color-text-primary, #eee);
            font-size: 0.9rem;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .folder-icon {
            color: var(--color-accent-primary, #f5c518);
            font-size: 1.1rem;
            flex-shrink: 0;
        }

        .folder-name {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .open-btn {
            background: transparent;
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: var(--color-text-secondary, #aaa);
            border-radius: 4px;
            padding: 3px 8px;
            font-size: 0.75rem;
            cursor: pointer;
            transition: all 0.15s;
        }

        .open-btn:hover {
            background: rgba(255, 255, 255, 0.15);
            color: #fff;
        }

        .empty-state, .loading-state {
            padding: var(--spacing-2xl, 32px);
            text-align: center;
            color: var(--color-text-tertiary, #777);
            font-size: 0.9rem;
        }

        .footer {
            padding: var(--spacing-md, 14px) var(--spacing-lg, 20px);
            border-top: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
            background: var(--color-bg-secondary, #141419);
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: var(--spacing-md, 16px);
        }

        .selected-preview {
            flex: 1;
            font-size: 0.8rem;
            color: var(--color-text-secondary, #aaa);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .selected-preview strong {
            color: var(--color-accent-primary, #f5c518);
        }

        .footer-actions {
            display: flex;
            gap: var(--spacing-sm, 8px);
            flex-shrink: 0;
        }
    `;

    @property({ type: Boolean }) declare open: boolean;
    @property({ type: String }) declare initialPath: string;

    @state() declare currentPath: string;
    @state() declare parentPath: string | null;
    @state() declare directories: DirectoryItem[];
    @state() declare shortcuts: ShortcutItem[];
    @state() declare selectedPath: string;
    @state() declare filterQuery: string;
    @state() declare loading: boolean;

    constructor() {
        super();
        this.open = false;
        this.initialPath = '';
        this.currentPath = '';
        this.parentPath = null;
        this.directories = [];
        this.shortcuts = [];
        this.selectedPath = '';
        this.filterQuery = '';
        this.loading = false;
    }

    override willUpdate(changedProperties: Map<string, unknown>) {
        if (changedProperties.has('open') && this.open) {
            this.selectedPath = this.initialPath || '';
            this.loadDirectory(this.initialPath || '');
        }
    }

    async loadDirectory(path: string) {
        this.loading = true;
        this.filterQuery = '';
        try {
            const url = path ? `/api/filesystem/browse?path=${encodeURIComponent(path)}` : '/api/filesystem/browse';
            const res = await fetch(url);
            if (res.ok) {
                const data: BrowseResponse = await res.json();
                this.currentPath = data.currentPath;
                this.parentPath = data.parentPath;
                this.directories = data.directories || [];
                this.shortcuts = data.shortcuts || [];
                this.selectedPath = data.currentPath;
            }
        } catch (e) {
            console.error('Failed to browse directory', e);
        } finally {
            this.loading = false;
        }
    }

    handlePathKeydown(e: KeyboardEvent) {
        if (e.key === 'Enter') {
            const input = e.target as HTMLInputElement;
            this.loadDirectory(input.value);
        }
    }

    handleFolderClick(dir: DirectoryItem) {
        this.selectedPath = dir.path;
    }

    handleFolderDblClick(dir: DirectoryItem) {
        this.loadDirectory(dir.path);
    }

    handleSelectFolder() {
        const path = this.selectedPath || this.currentPath;
        this.dispatchEvent(new CustomEvent('folder-selected', {
            detail: { path },
            bubbles: true,
            composed: true,
        }));
        this.close();
    }

    close() {
        this.open = false;
        this.dispatchEvent(new CustomEvent('ui-folder-browser-close', {
            bubbles: true,
            composed: true,
        }));
    }

    get filteredDirectories() {
        if (!this.filterQuery.trim()) return this.directories;
        const q = this.filterQuery.toLowerCase();
        return this.directories.filter(d => d.name.toLowerCase().includes(q));
    }

    override render() {
        if (!this.open) return html``;

        return html`
            <div class="modal-overlay" @click=${(e: MouseEvent) => { if (e.target === e.currentTarget) this.close(); }}>
                <div class="browser-dialog">
                    <div class="header">
                        <h3 class="header-title">
                            <span>📁</span> Select Directory
                        </h3>
                        <button class="close-btn" @click=${this.close} title="Close">✕</button>
                    </div>

                    ${when(this.shortcuts.length > 0, () => html`
                        <div class="shortcuts-bar">
                            ${map(this.shortcuts, sc => html`
                                <button class="shortcut-chip" @click=${() => this.loadDirectory(sc.path)}>
                                    ${sc.label}
                                </button>
                            `)}
                        </div>
                    `)}

                    <div class="nav-bar">
                        <button class="nav-btn" 
                            ?disabled=${!this.parentPath} 
                            @click=${() => this.parentPath && this.loadDirectory(this.parentPath)}
                            title="Go to parent directory">
                            ↑ Up
                        </button>
                        <input type="text"
                            class="path-input"
                            .value=${this.currentPath}
                            @keydown=${this.handlePathKeydown}
                            placeholder="/path/to/folder"
                        />
                        <button class="nav-btn" @click=${() => this.loadDirectory(this.currentPath)} title="Reload directory">
                            ↻
                        </button>
                    </div>

                    <div class="filter-row">
                        <input type="text"
                            class="filter-input"
                            placeholder="Filter folders..."
                            .value=${this.filterQuery}
                            @input=${(e: Event) => this.filterQuery = (e.target as HTMLInputElement).value}
                        />
                    </div>

                    <div class="folder-list">
                        ${when(this.loading, () => html`
                            <div class="loading-state">Loading directory contents...</div>
                        `)}

                        ${when(!this.loading && this.filteredDirectories.length === 0, () => html`
                            <div class="empty-state">No subdirectories found.</div>
                        `)}

                        ${when(!this.loading && this.filteredDirectories.length > 0, () => html`
                            ${map(this.filteredDirectories, dir => html`
                                <div class="folder-item ${this.selectedPath === dir.path ? 'selected' : ''}"
                                    @click=${() => this.handleFolderClick(dir)}
                                    @dblclick=${() => this.handleFolderDblClick(dir)}>
                                    <div class="folder-info">
                                        <span class="folder-icon">📁</span>
                                        <span class="folder-name">${dir.name}</span>
                                    </div>
                                    <button class="open-btn" 
                                        @click=${(e: MouseEvent) => { e.stopPropagation(); this.loadDirectory(dir.path); }}
                                        title="Enter folder">
                                        Open →
                                    </button>
                                </div>
                            `)}
                        `)}
                    </div>

                    <div class="footer">
                        <div class="selected-preview" title="${this.selectedPath || this.currentPath}">
                            Selected: <strong>${this.selectedPath || this.currentPath || 'None'}</strong>
                        </div>
                        <div class="footer-actions">
                            <ui-button variant="secondary" size="sm" @click=${this.close}>Cancel</ui-button>
                            <ui-button variant="primary" size="sm" @click=${this.handleSelectFolder}>
                                Select This Folder
                            </ui-button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}
