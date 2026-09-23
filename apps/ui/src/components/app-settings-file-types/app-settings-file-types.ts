import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';
import { toast } from '@repo/ui-components';
import '@repo/ui-components';
import type { FileTypeWhitelist } from '@repo/shared';

@customElement('app-settings-file-types')
export class AppSettingsFileTypes extends LitElement {
  static override styles = css`
    :host {
        display: block;
        max-width: 860px;
        margin: 0 auto;
        padding-bottom: var(--spacing-2xl, 40px);
    }

    .file-types-list {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
    }
    .file-type-card {
        background: var(--color-bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-md);
        padding: var(--spacing-md) var(--spacing-lg);
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--spacing-md);
    }
    .info {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        flex-wrap: wrap;
    }
    .extension-badge {
        font-family: monospace;
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-bold);
        color: var(--color-accent-primary);
        background: rgba(139, 92, 246, 0.1);
        padding: 4px 10px;
        border-radius: var(--border-radius-sm);
        border: 1px solid rgba(139, 92, 246, 0.2);
    }
    .magic-badge {
        font-family: monospace;
        font-size: var(--font-size-sm);
        color: var(--color-text-tertiary);
        background: var(--color-bg-tertiary);
        padding: 2px 8px;
        border-radius: var(--border-radius-sm);
        border: 1px solid var(--border-color);
    }
    .description {
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
    }
    .actions {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
    }
    .form-group {
        margin-bottom: var(--spacing-md);
    }
    label {
        display: block;
        margin-bottom: var(--spacing-xs);
        font-weight: bold;
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
    }
    input[type="text"] {
        width: 100%;
        padding: var(--spacing-sm) var(--spacing-md);
        border: 1px solid var(--border-color);
        background: var(--color-bg-tertiary);
        color: var(--color-text-primary);
        border-radius: var(--border-radius-sm);
        font-size: var(--font-size-base);
    }
    input[type="text"]:focus {
        outline: none;
        border-color: var(--color-accent-primary);
    }
    .hint {
        font-size: 0.8em;
        color: var(--color-text-tertiary);
        margin-top: 4px;
    }
  `;

  @state() fileTypes: FileTypeWhitelist[] = [];
  @state() loading: boolean = false;
  @state() isAddDialogOpen: boolean = false;

  @state() newExtension: string = '';
  @state() newMagicNumber: string = '';
  @state() newDescription: string = '';

  override connectedCallback() {
      super.connectedCallback();
      this.fetchFileTypes();
  }

  async fetchFileTypes() {
    try {
      this.loading = true;
      const res = await fetch('/api/file-types');
      if (res.ok) {
        this.fileTypes = await res.json();
      }
    } catch (e) {
      console.error('Error fetching file types', e);
      toast('Failed to load file types whitelist', 'error');
    } finally {
      this.loading = false;
    }
  }

  openAddDialog() {
      this.newExtension = '';
      this.newMagicNumber = '';
      this.newDescription = '';
      this.isAddDialogOpen = true;
  }

  closeAddDialog() {
      this.isAddDialogOpen = false;
  }

  async handleAddFileType(e: Event) {
      e.preventDefault();
      const ext = this.newExtension.trim().replace(/^\./, '').toLowerCase();
      if (!ext) return;

      try {
          const payload = {
              extension: ext,
              magicNumber: this.newMagicNumber.trim() ? this.newMagicNumber.trim().toUpperCase() : null,
              description: this.newDescription.trim() || null,
              enabled: true
          };

          const res = await fetch('/api/file-types', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });

          if (res.ok) {
              this.closeAddDialog();
              toast(`Added .${ext} to whitelist`, 'success');
              await this.fetchFileTypes();
          } else {
              const body = await res.json();
              toast(`Error adding file type: ${body.error}`, 'error');
          }
      } catch (e) {
          console.error("Failed to add file type:", e);
          toast('Failed to add file type', 'error');
      }
  }

  async handleDelete(item: FileTypeWhitelist) {
      if (!confirm(`Remove .${item.extension} from the scanner whitelist?`)) return;

      try {
          const res = await fetch(`/api/file-types/${item.id}`, { method: 'DELETE' });
          if (res.ok) {
              toast(`Removed .${item.extension}`, 'success');
              await this.fetchFileTypes();
          } else {
              toast('Failed to delete file type', 'error');
          }
      } catch (e) {
          console.error("Failed to delete file type", e);
          toast('Failed to delete file type', 'error');
      }
  }

  override render() {
    return html`
        <ui-page-header
            heading="ROM & BIOS File Types"
            subtitle="Configure allowed file extensions and optional header magic numbers enforced during library scanning."
            .breadcrumbs=${[
                { label: 'Settings', href: '/settings' },
                { label: 'File Types Whitelist' }
            ]}
        >
            <div slot="actions">
                <ui-button variant="primary" @click=${this.openAddDialog} size="sm">Add File Type</ui-button>
                <ui-button variant="secondary" href="/settings" size="sm">Back to Settings</ui-button>
            </div>
        </ui-page-header>

        
        ${this.loading ? html`<p>Loading file types...</p>` : html`
            <div class="file-types-list">
                ${this.fileTypes.length === 0 ? html`
                    <p style="color: var(--color-text-secondary);">No whitelist entries found.</p>
                ` : map(this.fileTypes, item => html`
                    <div class="file-type-card">
                        <div class="info">
                            <span class="extension-badge">.${item.extension}</span>
                            ${item.magicNumber ? html`
                                <span class="magic-badge" title="File header signature">Magic: ${item.magicNumber}</span>
                            ` : ''}
                            <span class="description">${item.description || 'No description'}</span>
                        </div>
                        <div class="actions">
                            <ui-button variant="error" size="sm" @click=${() => this.handleDelete(item)}>Remove</ui-button>
                        </div>
                    </div>
                `)}
            </div>
        `}

        <ui-dialog
            ?open=${this.isAddDialogOpen}
            @ui-dialog-close=${this.closeAddDialog}
            heading="Add Whitelist File Type">
            <form id="add-file-type-form" @submit=${this.handleAddFileType}>
                <div class="form-group">
                    <label>File Extension (required)</label>
                    <input type="text"
                        .value=${this.newExtension}
                        @input=${(e: Event) => this.newExtension = (e.target as HTMLInputElement).value}
                        placeholder="e.g. sfc, nes, gba, bin"
                        required />
                    <div class="hint">Without leading dot (e.g. "sfc")</div>
                </div>

                <div class="form-group">
                    <label>Magic Number (optional)</label>
                    <input type="text"
                        .value=${this.newMagicNumber}
                        @input=${(e: Event) => this.newMagicNumber = (e.target as HTMLInputElement).value}
                        placeholder="e.g. 4E45531A (hex signature)" />
                    <div class="hint">Hex string matched against file header. Leave blank if any file with this extension is allowed.</div>
                </div>

                <div class="form-group">
                    <label>Description (optional)</label>
                    <input type="text"
                        .value=${this.newDescription}
                        @input=${(e: Event) => this.newDescription = (e.target as HTMLInputElement).value}
                        placeholder="e.g. Super Nintendo ROM" />
                </div>
            </form>

            <div slot="footer">
                <ui-button variant="secondary" @click=${this.closeAddDialog}>Cancel</ui-button>
                <ui-button variant="primary" type="submit" form="add-file-type-form" ?disabled=${!this.newExtension.trim()}>
                    Save File Type
                </ui-button>
            </div>
        </ui-dialog>
      </div>
    `;
  }
}
