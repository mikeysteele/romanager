import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';
import { toast } from '@repo/ui-components';
import '@repo/ui-components';
import { SystemRead } from '@repo/shared'; // Using the extended type with firmware[]

@customElement('app-settings-platforms')
export class AppSettingsPlatforms extends LitElement {
  static override styles = css`
    :host {
        display: block;
        max-width: 860px;
        margin: 0 auto;
        padding-bottom: var(--spacing-2xl, 40px);
    }

    .systems-list {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
    }
    .system-card {
        background: var(--color-bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-lg);
        padding: var(--spacing-lg);
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
    }
    .system-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .system-title {
        font-weight: var(--font-weight-bold);
        font-size: var(--font-size-lg);
        color: var(--color-accent-primary);
    }
    .firmware-section {
        margin-top: var(--spacing-md);
        padding-top: var(--spacing-md);
        border-top: 1px solid rgba(255, 255, 255, 0.05);
    }
    .firmware-list {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs);
        margin-top: var(--spacing-sm);
    }
    .firmware-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--color-bg-tertiary);
        padding: var(--spacing-sm) var(--spacing-md);
        border-radius: var(--border-radius-sm);
        font-family: monospace;
        font-size: var(--font-size-sm);
    }
    .firmware-path {
        color: var(--color-text-secondary);
        font-size: 0.8em;
    }
    .actions {
        margin-top: var(--spacing-2xl);
    }
  `;

  @state() systems: SystemRead[] = [];
  @state() unmappedFiles: Array<{ id: string; path: string; filename: string; size: number }> = [];
  @state() loading: boolean = false;
  @state() activeSystemId: string | null = null;
  @state() isDialogOpen: boolean = false;
  
  @state() isAddSystemDialogOpen: boolean = false;
  @state() newSystemName: string = '';
  @state() newSystemPath: string = '';

  override connectedCallback() {
      super.connectedCallback();
      this.fetchSystems();
      this.fetchUnmapped();
  }

  async fetchUnmapped() {
      try {
          const res = await fetch('/api/unmapped');
          if (res.ok) {
              this.unmappedFiles = await res.json();
          }
      } catch (e) {
          console.error("Failed to fetch unmapped files", e);
      }
  }

  async fetchSystems() {
    try {
      this.loading = true;
      const res = await fetch('/api/systems');
      if (res.ok) {
        this.systems = await res.json();
      }
    } catch (e) {
      console.error('Error fetching systems', e);
    } finally {
      this.loading = false;
    }
  }

  async removeFirmware(firmwareId: string) {
      if (!confirm('Are you sure you want to unmap this firmware file?')) return;
      
      try {
          const res = await fetch(`/api/firmware/${firmwareId}`, { method: 'DELETE' });
          if (res.ok) {
              toast('Firmware removed', 'success');
              await this.fetchSystems();
          } else {
              toast('Failed to remove firmware', 'error');
          }
      } catch (e) {
          console.error("Failed to delete firmware mapper", e);
          toast('Failed to remove firmware', 'error');
      }
  }

  async assignFirmware(file: { id: string; path: string; filename: string; size: number }) {
      if (!this.activeSystemId) return;
      try {
          const payload = {
              systemId: this.activeSystemId,
              filename: file.filename,
              path: file.path
          };
          const res = await fetch('/api/firmware', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });
          
          if (res.ok) {
              this.isDialogOpen = false;
              this.activeSystemId = null;
              toast('Firmware assigned', 'success');
              await this.fetchSystems();
              await this.fetchUnmapped();
          } else {
              const body = await res.json();
              toast(`Error mapping firmware: ${body.error}`, 'error');
          }
      } catch (e) {
          console.error("Failed to map firmware", e);
          toast('Failed to map firmware', 'error');
      }
  }

  async handleIgnoreUnmapped(fileId: string) {
      if (!confirm('Are you sure you want to ignore this file? It will be hidden from all unmapped lists.')) return;
      try {
          const res = await fetch(`/api/unmapped/${fileId}/ignore`, { method: 'POST' });
          if (res.ok) {
              toast('File ignored', 'success');
              await this.fetchUnmapped();
              await this.fetchSystems();
          }
      } catch (e) {
          console.error("Error ignoring unmapped file:", e);
          toast('Failed to ignore file', 'error');
      }
  }

  async handleAddSystem(e: Event) {
      e.preventDefault();
      if (!this.newSystemName.trim()) return;

      try {
          const systemId = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
              ? crypto.randomUUID()
              : 'sys-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
          const payload = {
              id: systemId,
              name: this.newSystemName.trim(),
              slug: this.newSystemName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
              path: this.newSystemPath.trim() || null
          };

          const res = await fetch('/api/systems', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });

          if (res.ok) {
              this.isAddSystemDialogOpen = false;
              this.newSystemName = '';
              this.newSystemPath = '';
              toast('System added', 'success');
              await this.fetchSystems();
          } else {
              const body = await res.json();
              toast(`Error adding system: ${body.error}`, 'error');
          }
      } catch (e) {
          console.error("Failed to add system:", e);
          toast('Failed to add system', 'error');
      }
  }
  
  openAddSystemDialog() {
      this.isAddSystemDialogOpen = true;
  }

  closeAddSystemDialog() {
      this.isAddSystemDialogOpen = false;
      this.newSystemName = '';
      this.newSystemPath = '';
  }

  openMappingDialog(systemId: string) {
      this.activeSystemId = systemId;
      this.isDialogOpen = true;
  }

  closeDialog() {
      this.isDialogOpen = false;
      this.activeSystemId = null;
  }

  _renderSystem(system: SystemRead) {
      return html`
        <div class="system-card">
            <div class="system-header">
                <span class="system-title">${system.name}</span>
                <ui-badge variant="info">${system.slug}</ui-badge>
            </div>
            
            <div class="firmware-section">
                <div>
                    <strong>Required Firmware</strong>
                    <ui-button variant="secondary" size="sm" style="float: right;" @click=${() => this.openMappingDialog(system.id)}>Map File</ui-button>
                </div>
                ${!system.firmware || system.firmware.length === 0 ? html`
                    <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm); margin-top: var(--spacing-sm);">
                        No firmware assigned to this system.
                    </p>
                ` : html`
                    <div class="firmware-list">
                        ${map(system.firmware!, fw => html`
                            <div class="firmware-item">
                                <div>
                                    <div style="font-weight: bold;">${fw.filename}</div>
                                    <div class="firmware-path">${fw.path}</div>
                                </div>
                                <ui-button variant="error" size="sm" @click=${() => this.removeFirmware(fw.id)}>Remove</ui-button>
                            </div>
                        `)}
                    </div>
                `}
            </div>
        </div>
      `;
  }

  override render() {
    return html`
        <ui-page-header
            heading="Platforms & Firmware"
            subtitle="Configure supported emulation systems, manage core paths, and map required BIOS files."
            .breadcrumbs=${[
                { label: 'Settings', href: '/settings' },
                { label: 'Platforms & Firmware' }
            ]}
        >
            <div slot="actions">
                <ui-button variant="primary" @click=${this.openAddSystemDialog} size="sm">Add System</ui-button>
                <ui-button variant="secondary" href="/settings" size="sm">Back to Settings</ui-button>
            </div>
        </ui-page-header>

        
        ${this.loading ? html`<p>Loading systems...</p>` : html`
            <div class="systems-list">
                ${map(this.systems, sys => this._renderSystem(sys))}
            </div>
        `}

        <ui-dialog 
            ?open=${this.isDialogOpen} 
            @ui-dialog-close=${this.closeDialog}
            heading="Map Firmware File">
            
            ${this.unmappedFiles.length === 0 ? html`
                <p>No unmapped files available. Scan your library first to populate unmapped files.</p>
            ` : html`
                <p style="margin-bottom: var(--spacing-md); color: var(--color-text-secondary);">Select an unmapped file to assign to this system's firmware definitions:</p>
                <div style="max-height: 400px; overflow-y: auto; display: flex; flex-direction: column; gap: var(--spacing-xs);">
                    ${map(this.unmappedFiles, file => html`
                        <div class="firmware-item" style="cursor: pointer; display: flex; align-items: center;" @click=${() => this.assignFirmware(file)}>
                            <div style="flex:1;">
                                <div style="font-weight: bold;">${file.filename}</div>
                                <div class="firmware-path">${file.path}</div>
                            </div>
                            <div style="display: flex; gap: var(--spacing-xs);">
                                <ui-button variant="primary" size="sm" @click=${() => this.assignFirmware(file)}>Assign</ui-button>
                                <ui-button variant="secondary" size="sm" @click=${(e: Event) => { e.stopPropagation(); this.handleIgnoreUnmapped(file.id); }}>Ignore</ui-button>
                            </div>
                        </div>
                    `)}
                </div>
            `}
            
            <ui-button slot="footer" variant="secondary" @click=${this.closeDialog}>Close</ui-button>
        </ui-dialog>

        <ui-dialog 
            ?open=${this.isAddSystemDialogOpen} 
            @ui-dialog-close=${this.closeAddSystemDialog}
            heading="Add Support For System">
            <form id="add-system-form" @submit=${this.handleAddSystem}>
                <div style="margin-bottom: var(--spacing-md);">
                    <label style="display: block; margin-bottom: var(--spacing-xs); font-weight: bold; color: var(--color-text-secondary);">System Name required</label>
                    <input type="text" 
                        .value=${this.newSystemName} 
                        @input=${(e: Event) => this.newSystemName = (e.target as HTMLInputElement).value}
                        placeholder="e.g. PlayStation 2"
                        required
                        style="width: 100%; padding: var(--spacing-sm); border: 1px solid var(--border-color); background: var(--color-bg-tertiary); color: var(--color-text-primary); border-radius: var(--border-radius-sm);" />
                </div>
                
                <div style="margin-bottom: var(--spacing-md);">
                    <label style="display: block; margin-bottom: var(--spacing-xs); font-weight: bold; color: var(--color-text-secondary);">Core Path optional</label>
                    <input type="text" 
                        .value=${this.newSystemPath} 
                        @input=${(e: Event) => this.newSystemPath = (e.target as HTMLInputElement).value}
                        placeholder="e.g. ps2"
                        style="width: 100%; padding: var(--spacing-sm); border: 1px solid var(--border-color); background: var(--color-bg-tertiary); color: var(--color-text-primary); border-radius: var(--border-radius-sm);" />
                    <div style="font-size: 0.8em; color: var(--color-text-secondary); margin-top: 4px;">Path fragment targeting EmulationStation mappings.</div>
                </div>
            </form>
            
            <div slot="footer">
                <ui-button variant="secondary" @click=${this.closeAddSystemDialog}>Cancel</ui-button>
                <ui-button variant="primary" type="submit" form="add-system-form" ?disabled=${!this.newSystemName.trim()}>Add System</ui-button>
            </div>
        </ui-dialog>
      </div>
    `;
  }
}
