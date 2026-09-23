import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { when } from 'lit/directives/when.js';
import { toast } from '@repo/ui-components';
import type { ColumnDef } from '@repo/ui-components';
import '../app-import/app-import.ts';
import '@repo/ui-components';

interface ScannedFile {
    id: string;
    path: string;
    filename: string;
    size: number;
}

@customElement('app-unmapped')
export class AppUnmapped extends LitElement {
    static override styles = css`
        :host {
            display: block;
        }
        h1 {
            color: var(--color-text-primary);
            margin-bottom: var(--spacing-xl);
        }
        .loading {
            padding: var(--spacing-xl);
            text-align: center;
            color: var(--color-text-secondary);
        }
    `;

    @state() declare files: ScannedFile[];
    @state() declare loading: boolean;
    @state() declare selectedFileForImport: ScannedFile | null;
    @state() declare selectedFilesForImport: ScannedFile[];
    @state() declare searchTerm: string;
    @state() declare selectedIds: string[];

    constructor() {
        super();
        this.files = [];
        this.loading = false;
        this.selectedFileForImport = null;
        this.selectedFilesForImport = [];
        this.searchTerm = '';
        this.selectedIds = [];
    }

    private columns: ColumnDef<ScannedFile>[] = [
        { header: "Filename", key: "filename", sortable: true },
        { header: "Path", key: "path", sortable: true },
        { 
            header: "Size", 
            key: "size",
            sortable: true,
            render: (file: ScannedFile) => {
                const mb = (file.size / (1024 * 1024)).toFixed(2);
                return html`${mb} MB`;
            }
        },
        {
            header: "Actions",
            key: "id",
            render: (file: ScannedFile) => html`
                <ui-button variant="primary" size="sm" @click=${() => this.handleImportClick(file)}>
                  Review
                </ui-button>
                <ui-button variant="secondary" size="sm" @click=${() => this.handleIgnoreClick(file.id)} style="margin-left: var(--spacing-xs);">
                  Ignore
                </ui-button>
            `
        }
    ];

    override connectedCallback() {
        super.connectedCallback();
        this.fetchFiles();
    }

    async fetchFiles() {
        try {
            this.loading = true;
            const res = await fetch('/api/unmapped');
            if (res.ok) {
                this.files = await res.json();
            }
        } catch (e) {
            console.error("Failed to fetch unmapped files", e);
        } finally {
            this.loading = false;
        }
    }

    handleImportClick = (file: ScannedFile) => {
        this.selectedFileForImport = file;
        this.selectedFilesForImport = [file];
    };

    handleGroupReview = () => {
        if (this.selectedIds.length === 0) return;
        const selected = this.files.filter(f => this.selectedIds.includes(f.id));
        if (selected.length === 0) return;
        this.selectedFileForImport = selected[0];
        this.selectedFilesForImport = selected;
    };

    async handleIgnoreClick(fileId: string) {
        if (!confirm('Ignore this file?')) return;
        try {
            const res = await fetch(`/api/unmapped/${fileId}/ignore`, { method: 'POST' });
            if (res.ok) {
                toast('File ignored', 'success');
                await this.fetchFiles();
            }
        } catch (e) {
            console.error("Error ignoring file", e);
            toast('Failed to ignore file', 'error');
        }
    }

    async handleBulkIgnore() {
        if (this.selectedIds.length === 0) return;
        if (!confirm(`Ignore ${this.selectedIds.length} selected files?`)) return;
        
        try {
            const res = await fetch('/api/unmapped/bulk-ignore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: this.selectedIds })
            });
            if (res.ok) {
                toast(`${this.selectedIds.length} files ignored`, 'success');
                this.selectedIds = [];
                await this.fetchFiles();
            }
        } catch (e) {
            console.error("Error during bulk ignore", e);
            toast('Bulk ignore failed', 'error');
        }
    }

    handleSelectionChange(e: CustomEvent) {
        this.selectedIds = e.detail.selectedIds;
    }

    handleSearch(e: Event) {
        this.searchTerm = (e.target as HTMLInputElement).value.toLowerCase();
    }

    get filteredFiles() {
        if (!this.searchTerm) return this.files;
        return this.files.filter(f => 
            f.filename.toLowerCase().includes(this.searchTerm) || 
            f.path.toLowerCase().includes(this.searchTerm)
        );
    }

    handleImportComplete = () => {
        this.selectedFileForImport = null;
        this.selectedFilesForImport = [];
        this.selectedIds = [];
        this.fetchFiles(); // Refresh list to remove the imported file
    };

    handleImportCancel = () => {
        this.selectedFileForImport = null;
        this.selectedFilesForImport = [];
    };

    override render() {
        return html`
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-lg);">
                <h1>Unmapped Files (${this.files.length})</h1>
                <div style="display: flex; gap: var(--spacing-md); align-items: center;">
                    ${this.selectedIds.length > 1 ? html`
                        <ui-button variant="primary" size="sm" @click=${this.handleGroupReview}>
                            Group & Review (${this.selectedIds.length})
                        </ui-button>
                    ` : ''}
                    ${this.selectedIds.length > 0 ? html`
                        <ui-button variant="error" size="sm" @click=${this.handleBulkIgnore}>
                            Ignore Selected (${this.selectedIds.length})
                        </ui-button>
                    ` : ''}
                    <input type="text" 
                        placeholder="Search files..." 
                        @input=${this.handleSearch}
                        style="padding: var(--spacing-sm); border: 1px solid var(--border-color); border-radius: var(--border-radius-sm); background: var(--color-bg-tertiary); color: var(--color-text-primary); width: 250px;" />
                </div>
            </div>
            
            ${when(this.loading, () => html`<div class="loading">Loading files...</div>`)}

            ${when(!this.loading, () => html`
                <data-table 
                    selectable
                    .columns=${this.columns} 
                    .data=${this.filteredFiles}
                    @selection-change=${this.handleSelectionChange}>
                </data-table>
            `)}
            
            <app-import 
                .selectedFile=${this.selectedFileForImport}
                .selectedFiles=${this.selectedFilesForImport}
                .allUnmappedFiles=${this.files}
                @import-complete=${this.handleImportComplete}
                @import-cancel=${this.handleImportCancel}>
            </app-import>
        `;
    }
}
