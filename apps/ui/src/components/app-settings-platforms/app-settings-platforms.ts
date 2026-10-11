import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';
import { toast } from '@repo/ui-components';
import '@repo/ui-components';
import { PlatformRead } from '@repo/shared';

@customElement('app-settings-platforms')
export class AppSettingsPlatforms extends LitElement {
  static override styles = css`
    :host {
        display: block;
        max-width: 860px;
        margin: 0 auto;
        padding-bottom: var(--spacing-2xl, 40px);
    }

    .platforms-list {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
    }
    .platform-card {
        background: var(--color-bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-lg);
        padding: var(--spacing-lg);
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
    }
    .platform-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .platform-title {
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

  @state() platforms: PlatformRead[] = [];
  get systems() { return this.platforms; }
  set systems(val: PlatformRead[]) { this.platforms = val; }

  @state() unmappedFiles: Array<{ id: string; path: string; filename: string; size: number }> = [];
  @state() loading: boolean = false;
  @state() activePlatformId: string | null = null;
  @state() isDialogOpen: boolean = false;
  
  @state() isAddPlatformDialogOpen: boolean = false;
  @state() newPlatformName: string = '';
  @state() newPlatformPath: string = '';

  override connectedCallback() {
      super.connectedCallback();
      this.fetchPlatforms();
      this.fetchUnmapped();
      globalThis.addEventListener('platforms-updated', this.handlePlatformsUpdated);
      globalThis.addEventListener('systems-updated', this.handlePlatformsUpdated);
      globalThis.addEventListener('roms-updated', this.handlePlatformsUpdated);
  }

  override disconnectedCallback() {
      super.disconnectedCallback();
      globalThis.removeEventListener('platforms-updated', this.handlePlatformsUpdated);
      globalThis.removeEventListener('systems-updated', this.handlePlatformsUpdated);
      globalThis.removeEventListener('roms-updated', this.handlePlatformsUpdated);
  }

  handlePlatformsUpdated = () => {
      this.fetchPlatforms();
  };

  async removePlatform(platformId: string, platformName: string) {
      if (!confirm(`Are you sure you want to remove the platform "${platformName}"? This action cannot be undone.`)) return;
      
      try {
          const res = await fetch(`/api/platforms/${platformId}`, { method: 'DELETE' });
          if (res.ok) {
              toast(`Platform "${platformName}" removed`, 'success');
              await this.fetchPlatforms();
              globalThis.dispatchEvent(new CustomEvent('platforms-updated'));
              globalThis.dispatchEvent(new CustomEvent('systems-updated'));
          } else {
              const body = await res.json().catch(() => ({}));
              toast(body.error || 'Failed to remove platform', 'error');
          }
      } catch (e) {
          console.error("Failed to delete platform", e);
          toast('Failed to remove platform', 'error');
      }
  }

  // Alias for backward compatibility
  removeSystem(id: string, name: string) {
      return this.removePlatform(id, name);
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

  async fetchPlatforms() {
    try {
      this.loading = true;
      const res = await fetch('/api/platforms');
      if (res.ok) {
        this.platforms = await res.json();
      }
    } catch (e) {
      console.error('Error fetching platforms', e);
    } finally {
      this.loading = false;
    }
  }

  fetchSystems() {
    return this.fetchPlatforms();
  }

  async removeFirmware(firmwareId: string) {
      if (!confirm('Are you sure you want to unmap this firmware file?')) return;
      
      try {
          const res = await fetch(`/api/firmware/${firmwareId}`, { method: 'DELETE' });
          if (res.ok) {
              toast('Firmware removed', 'success');
              await this.fetchPlatforms();
          } else {
              toast('Failed to remove firmware', 'error');
          }
      } catch (e) {
          console.error("Failed to delete firmware mapper", e);
          toast('Failed to remove firmware', 'error');
      }
  }

  async assignFirmware(file: { id: string; path: string; filename: string; size: number }) {
      if (!this.activePlatformId) return;
      try {
          const payload = {
              systemId: this.activePlatformId,
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
              this.activePlatformId = null;
              toast('Firmware assigned', 'success');
              await this.fetchPlatforms();
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
              await this.fetchPlatforms();
          }
      } catch (e) {
          console.error("Error ignoring unmapped file:", e);
          toast('Failed to ignore file', 'error');
      }
  }

  async handleAddPlatform(e: Event) {
      e.preventDefault();
      if (!this.newPlatformName.trim()) return;

      try {
          const platformId = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
              ? crypto.randomUUID()
              : 'plat-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
          const payload = {
              id: platformId,
              name: this.newPlatformName.trim(),
              slug: this.newPlatformName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
              path: this.newPlatformPath.trim() || null
          };

          const res = await fetch('/api/platforms', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });

          if (res.ok) {
              this.isAddPlatformDialogOpen = false;
              this.newPlatformName = '';
              this.newPlatformPath = '';
              toast('Platform added', 'success');
              await this.fetchPlatforms();
              globalThis.dispatchEvent(new CustomEvent('platforms-updated'));
              globalThis.dispatchEvent(new CustomEvent('systems-updated'));
          } else {
              const body = await res.json();
              toast(`Error adding platform: ${body.error}`, 'error');
          }
      } catch (e) {
          console.error("Failed to add platform:", e);
          toast('Failed to add platform', 'error');
      }
  }

  // Backward compatibility alias
  handleAddSystem(e: Event) {
      return this.handleAddPlatform(e);
  }
  
  openAddPlatformDialog() {
      this.isAddPlatformDialogOpen = true;
  }

  openAddSystemDialog() {
      this.openAddPlatformDialog();
  }

  closeAddPlatformDialog() {
      this.isAddPlatformDialogOpen = false;
      this.newPlatformName = '';
      this.newPlatformPath = '';
  }

  closeAddSystemDialog() {
      this.closeAddPlatformDialog();
  }

  openMappingDialog(platformId: string) {
      this.activePlatformId = platformId;
      this.isDialogOpen = true;
  }

  closeDialog() {
      this.isDialogOpen = false;
      this.activePlatformId = null;
  }

  _renderPlatform(platform: PlatformRead) {
      const romCount = platform.romCount ?? 0;
      const canDelete = romCount === 0;

      return html`
        <div class="platform-card">
            <div class="platform-header">
                <div style="display: flex; align-items: center; gap: var(--spacing-sm); flex-wrap: wrap;">
                    <span class="platform-title">${platform.name}</span>
                    <ui-badge variant="secondary">${platform.slug}</ui-badge>
                    ${canDelete ? html`
                        <ui-badge variant="secondary">0 ROMs</ui-badge>
                    ` : html`
                        <ui-badge variant="accent">🔒 ${romCount} ${romCount === 1 ? 'ROM' : 'ROMs'}</ui-badge>
                    `}
                </div>
                ${canDelete ? html`
                    <ui-button variant="error" size="sm" @click=${() => this.removePlatform(platform.id, platform.name)}>
                        Remove Platform
                    </ui-button>
                ` : ''}
            </div>
            
            <div class="firmware-section">
                <div>
                    <strong>Required Firmware</strong>
                    <ui-button variant="secondary" size="sm" style="float: right;" @click=${() => this.openMappingDialog(platform.id)}>Map File</ui-button>
                </div>
                ${!platform.firmware || platform.firmware.length === 0 ? html`
                    <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm); margin-top: var(--spacing-sm);">
                        No firmware assigned to this platform.
                    </p>
                ` : html`
                    <div class="firmware-list">
                        ${map(platform.firmware!, fw => html`
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

  _renderSystem(system: PlatformRead) {
      return this._renderPlatform(system);
  }

  override render() {
    return html`
        <ui-page-header
            heading="Platforms & Firmware"
            subtitle="Configure supported emulation platforms, manage core paths, and map required BIOS files."
            .breadcrumbs=${[
                { label: 'Settings', href: '/settings' },
                { label: 'Platforms & Firmware' }
            ]}
        >
            <div slot="actions">
                <ui-button variant="primary" @click=${this.openAddPlatformDialog} size="sm">Add Platform</ui-button>
                <ui-button variant="secondary" href="/settings" size="sm">Back to Settings</ui-button>
            </div>
        </ui-page-header>

        
        ${this.loading ? html`<p>Loading platforms...</p>` : html`
            <div class="platforms-list">
                ${this.platforms.length === 0 ? html`
                    <p style="color: var(--color-text-secondary);">No platforms configured. Click "Add Platform" to create one.</p>
                ` : map(this.platforms, plat => this._renderPlatform(plat))}
            </div>
        `}

        <ui-dialog 
            ?open=${this.isDialogOpen} 
            @ui-dialog-close=${this.closeDialog}
            heading="Map Firmware File">
            
            ${this.unmappedFiles.length === 0 ? html`
                <p>No unmapped files available. Scan your library first to populate unmapped files.</p>
            ` : html`
                <p style="margin-bottom: var(--spacing-md); color: var(--color-text-secondary);">Select an unmapped file to assign to this platform's firmware definitions:</p>
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
            
            <ui-button slot="actions" variant="secondary" @click=${this.closeDialog}>Close</ui-button>
        </ui-dialog>

        <ui-dialog 
            ?open=${this.isAddPlatformDialogOpen} 
            @ui-dialog-close=${this.closeAddPlatformDialog}
            heading="Add Platform">
            <form id="add-platform-form" @submit=${this.handleAddPlatform}>
                <div style="margin-bottom: var(--spacing-md);">
                    <label style="display: block; margin-bottom: var(--spacing-xs); font-weight: bold; color: var(--color-text-secondary);">Platform Name required</label>
                    <input type="text" 
                        .value=${this.newPlatformName} 
                        @input=${(e: Event) => this.newPlatformName = (e.target as HTMLInputElement).value}
                        placeholder="e.g. PlayStation 2"
                        required
                        style="width: 100%; padding: var(--spacing-sm); border: 1px solid var(--border-color); background: var(--color-bg-tertiary); color: var(--color-text-primary); border-radius: var(--border-radius-sm);" />
                </div>
                
                <div style="margin-bottom: var(--spacing-md);">
                    <label style="display: block; margin-bottom: var(--spacing-xs); font-weight: bold; color: var(--color-text-secondary);">Core Path optional</label>
                    <input type="text" 
                        .value=${this.newPlatformPath} 
                        @input=${(e: Event) => this.newPlatformPath = (e.target as HTMLInputElement).value}
                        placeholder="e.g. ps2"
                        style="width: 100%; padding: var(--spacing-sm); border: 1px solid var(--border-color); background: var(--color-bg-tertiary); color: var(--color-text-primary); border-radius: var(--border-radius-sm);" />
                    <div style="font-size: 0.8em; color: var(--color-text-secondary); margin-top: 4px;">Path fragment targeting EmulationStation mappings.</div>
                </div>
            </form>
            
            <div slot="actions">
                <ui-button variant="secondary" @click=${this.closeAddPlatformDialog}>Cancel</ui-button>
                <ui-button variant="primary" type="submit" form="add-platform-form" @click=${this.handleAddPlatform} ?disabled=${!this.newPlatformName.trim()}>Add Platform</ui-button>
            </div>
        </ui-dialog>
      </div>
    `;
  }
}
