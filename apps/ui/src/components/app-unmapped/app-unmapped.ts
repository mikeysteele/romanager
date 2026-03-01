import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { when } from 'lit/directives/when.js';
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

    @state() files: ScannedFile[] = [];
    @state() loading: boolean = false;
    @state() selectedFileForImport: ScannedFile | null = null;

    private columns: ColumnDef<ScannedFile>[] = [
        { header: "Filename", key: "filename" },
        { header: "Path", key: "path" },
        { 
            header: "Size", 
            key: "size",
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

    handleImportClick(file: ScannedFile) {
        this.selectedFileForImport = file;
    }
    
    handleImportComplete() {
        this.selectedFileForImport = null;
        this.fetchFiles(); // Refresh list to remove the imported file
    }

    handleImportCancel() {
        this.selectedFileForImport = null;
    }

    override render() {
        return html`
            <h1>Unmapped Files (${this.files.length})</h1>
            
            ${when(this.loading, () => html`<div class="loading">Loading files...</div>`)}

            ${when(!this.loading, () => html`
                <data-table 
                    .columns=${this.columns} 
                    .data=${this.files}>
                </data-table>
            `)}
            
            <app-import 
                .selectedFile=${this.selectedFileForImport}
                @import-complete=${this.handleImportComplete}
                @import-cancel=${this.handleImportCancel}>
            </app-import>
        `;
    }
}
