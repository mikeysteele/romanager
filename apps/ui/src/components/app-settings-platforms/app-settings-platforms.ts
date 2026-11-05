import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';
import { toast } from '@repo/ui-components';
import '@repo/ui-components';
import { PlatformRead, getCoresForPlatform, getDefaultEmulatorConfig } from '@repo/shared';

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
        gap: var(--spacing-sm);
        flex-wrap: wrap;
    }
    .platform-title {
        font-weight: var(--font-weight-bold);
        font-size: var(--font-size-lg);
        color: var(--color-accent-primary);
    }
    .emulation-section {
        margin-top: var(--spacing-sm);
        padding-top: var(--spacing-md);
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--spacing-md);
    }
    .emulation-toggle-label {
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-sm);
        cursor: pointer;
        user-select: none;
        font-size: var(--font-size-sm);
        font-weight: 500;
        color: var(--color-text-primary);
    }
    .emulation-toggle-label.disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    .emulation-toggle-label input[type="checkbox"] {
        width: 16px;
        height: 16px;
        cursor: pointer;
        accent-color: var(--color-accent-primary, #f5c518);
    }
    .emulation-toggle-label input[type="checkbox"]:disabled {
        cursor: not-allowed;
    }
    .core-selector-group {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        flex-wrap: wrap;
    }
    .core-selector-group label {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
    }
    .core-select {
        padding: 6px 10px;
        border: 1px solid var(--border-color);
        background: var(--color-bg-tertiary);
        color: var(--color-text-primary);
        border-radius: var(--border-radius-sm);
        font-size: var(--font-size-sm);
        min-width: 240px;
    }
    .core-select:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    .firmware-section {
        margin-top: var(--spacing-sm);
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
  set systems(val: PlatformRead[]) { this.platforms = this.sortPlatforms(val); }

  @state() unmappedFiles: Array<{ id: string; path: string; filename: string; size: number }> = [];
  @state() loading: boolean = false;
  @state() activePlatformId: string | null = null;
  @state() isDialogOpen: boolean = false;
  
  @state() isAddPlatformDialogOpen: boolean = false;
  @state() newPlatformName: string = '';
  @state() newPlatformPath: string = '';
  @state() newPlatformEmulatable: boolean = false;
  @state() newPlatformCore: string = '';
  @state() newPlatformEmulatableTouched: boolean = false;

  private sortPlatforms(list: PlatformRead[]): PlatformRead[] {
      return [...list].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  }

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

  async updatePlatformEmulation(
      platform: PlatformRead,
      updates: { emulatable?: boolean; emulatorCore?: string | null }
  ) {
      try {
          const res = await fetch(`/api/platforms/${platform.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updates)
          });
          if (res.ok) {
              const updated = await res.json();
              this.platforms = this.sortPlatforms(
                  this.platforms.map(p => (p.id === platform.id ? { ...p, ...updated } : p))
              );
              toast(`Updated browser emulation for "${platform.name}"`, 'success');
              globalThis.dispatchEvent(new CustomEvent('platforms-updated'));
          } else {
              const body = await res.json().catch(() => ({}));
              toast(body.error || 'Failed to update platform emulation settings', 'error');
              await this.fetchPlatforms();
          }
      } catch (e) {
          console.error('Failed to update platform emulation settings', e);
          toast('Failed to update platform emulation settings', 'error');
      }
  }

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
    const showLoadingSpinner = this.platforms.length === 0;
    try {
      if (showLoadingSpinner) {
        this.loading = true;
      }
      const res = await fetch('/api/platforms');
      if (res.ok) {
        const data: PlatformRead[] = await res.json();
        this.platforms = this.sortPlatforms(data);
      }
    } catch (e) {
      console.error('Error fetching platforms', e);
    } finally {
      if (showLoadingSpinner) {
        this.loading = false;
      }
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

  private syncNewPlatformDefaults(name: string, path: string) {
      const availableCores = getCoresForPlatform(name, path || null);
      if (availableCores.length === 0) {
          this.newPlatformEmulatable = false;
          this.newPlatformCore = '';
          return;
      }
      if (!this.newPlatformEmulatableTouched) {
          const defaults = getDefaultEmulatorConfig(name, path || null);
          this.newPlatformEmulatable = defaults.emulatable;
          this.newPlatformCore = defaults.emulatorCore || availableCores[0].id;
      } else if (this.newPlatformCore && !availableCores.some(c => c.id === this.newPlatformCore)) {
          const defaults = getDefaultEmulatorConfig(name, path || null);
          this.newPlatformCore = defaults.emulatorCore || availableCores[0].id;
      }
  }

  handleNewPlatformNameInput(value: string) {
      this.newPlatformName = value;
      this.syncNewPlatformDefaults(value, this.newPlatformPath);
  }

  handleNewPlatformPathInput(value: string) {
      this.newPlatformPath = value;
      this.syncNewPlatformDefaults(this.newPlatformName, value);
  }

  async handleAddPlatform(e: Event) {
      e.preventDefault();
      if (!this.newPlatformName.trim() || this.loading) return;
      this.loading = true;

      try {
          const platformId = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
              ? crypto.randomUUID()
              : 'plat-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
          const slug = this.newPlatformName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
          const availableCores = getCoresForPlatform(slug || this.newPlatformName.trim(), this.newPlatformPath.trim() || null);
          const defaults = getDefaultEmulatorConfig(slug || this.newPlatformName.trim(), this.newPlatformPath.trim() || null);
          const hasCoreSupport = availableCores.length > 0;
          const emulatable = hasCoreSupport
              ? (this.newPlatformEmulatableTouched ? this.newPlatformEmulatable : defaults.emulatable)
              : false;
          const emulatorCore = hasCoreSupport
              ? (this.newPlatformEmulatableTouched
                  ? (this.newPlatformCore || defaults.emulatorCore || availableCores[0].id)
                  : (defaults.emulatorCore || availableCores[0].id))
              : null;

          const payload = {
              id: platformId,
              name: this.newPlatformName.trim(),
              slug,
              path: this.newPlatformPath.trim() || null,
              emulatable,
              emulatorCore,
          };

          const res = await fetch('/api/platforms', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });

          if (res.ok) {
              this.closeAddPlatformDialog();
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
      } finally {
          this.loading = false;
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
      this.newPlatformEmulatable = false;
      this.newPlatformCore = '';
      this.newPlatformEmulatableTouched = false;
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
      const availableCores = getCoresForPlatform(platform.slug || platform.name, platform.esFolder || platform.path);
      const hasCoreSupport = availableCores.length > 0;
      const defaults = getDefaultEmulatorConfig(platform.slug || platform.name, platform.esFolder || platform.path);
      const isEmulatable = hasCoreSupport && (platform.emulatable !== undefined ? Boolean(platform.emulatable) : defaults.emulatable);
      const selectedCore = hasCoreSupport ? (platform.emulatorCore ?? defaults.emulatorCore ?? '') : '';

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
                    ${!hasCoreSupport ? html`
                        <ui-badge variant="secondary">No WASM Core Available</ui-badge>
                    ` : isEmulatable ? html`
                        <ui-badge variant="accent">▶ Browser: ${selectedCore || 'Auto'}</ui-badge>
                    ` : html`
                        <ui-badge variant="secondary">Browser Emulation Off</ui-badge>
                    `}
                </div>
                ${canDelete ? html`
                    <ui-button variant="error" size="sm" @click=${() => this.removePlatform(platform.id, platform.name)}>
                        Remove Platform
                    </ui-button>
                ` : ''}
            </div>

            <div class="emulation-section">
                <label
                    class="emulation-toggle-label ${!hasCoreSupport ? 'disabled' : ''}"
                    title=${!hasCoreSupport ? 'No compatible Libretro WASM core is available for this platform' : ''}
                >
                    <input
                        type="checkbox"
                        .checked=${isEmulatable}
                        ?disabled=${!hasCoreSupport}
                        @change=${(e: Event) => {
                            if (!hasCoreSupport) return;
                            const checked = (e.target as HTMLInputElement).checked;
                            const nextCore = checked && !platform.emulatorCore
                                ? (defaults.emulatorCore || availableCores[0]?.id || null)
                                : (platform.emulatorCore ?? defaults.emulatorCore ?? availableCores[0]?.id ?? null);
                            this.updatePlatformEmulation(platform, {
                                emulatable: checked,
                                emulatorCore: nextCore,
                            });
                        }}
                    />
                    Emulate in Browser (WASM Libretro)
                </label>

                <div class="core-selector-group">
                    <label>Libretro Core:</label>
                    <select
                        class="core-select"
                        .value=${selectedCore}
                        ?disabled=${!hasCoreSupport || !isEmulatable}
                        @change=${(e: Event) => {
                            if (!hasCoreSupport) return;
                            const val = (e.target as HTMLSelectElement).value || null;
                            this.updatePlatformEmulation(platform, {
                                emulatable: isEmulatable,
                                emulatorCore: val,
                            });
                        }}
                    >
                        ${!hasCoreSupport ? html`
                            <option value="" selected>No WASM core available</option>
                        ` : html`
                            <option value="" ?selected=${!selectedCore}>Auto-detect core</option>
                            ${map(availableCores, core => html`
                                <option value=${core.id} title=${core.systems} ?selected=${selectedCore === core.id}>
                                    ${core.name} (${core.id})
                                </option>
                            `)}
                        `}
                    </select>
                </div>
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
    const newPlatformCores = getCoresForPlatform(this.newPlatformName, this.newPlatformPath || null);
    const canEmulateNewPlatform = newPlatformCores.length > 0;

    return html`
        <ui-page-header
            heading="Platforms & Firmware"
            subtitle="Configure supported emulation platforms, browser WASM cores, and required BIOS files."
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
                        @input=${(e: Event) => this.handleNewPlatformNameInput((e.target as HTMLInputElement).value)}
                        placeholder="e.g. PlayStation 2"
                        required
                        style="width: 100%; padding: var(--spacing-sm); border: 1px solid var(--border-color); background: var(--color-bg-tertiary); color: var(--color-text-primary); border-radius: var(--border-radius-sm);" />
                </div>
                
                <div style="margin-bottom: var(--spacing-md);">
                    <label style="display: block; margin-bottom: var(--spacing-xs); font-weight: bold; color: var(--color-text-secondary);">Core Path optional</label>
                    <input type="text" 
                        .value=${this.newPlatformPath} 
                        @input=${(e: Event) => this.handleNewPlatformPathInput((e.target as HTMLInputElement).value)}
                        placeholder="e.g. ps2"
                        style="width: 100%; padding: var(--spacing-sm); border: 1px solid var(--border-color); background: var(--color-bg-tertiary); color: var(--color-text-primary); border-radius: var(--border-radius-sm);" />
                    <div style="font-size: 0.8em; color: var(--color-text-secondary); margin-top: 4px;">Path fragment targeting EmulationStation mappings.</div>
                </div>

                <div style="margin-bottom: var(--spacing-md);">
                    <label class="emulation-toggle-label ${!canEmulateNewPlatform ? 'disabled' : ''}">
                        <input
                            type="checkbox"
                            .checked=${canEmulateNewPlatform && this.newPlatformEmulatable}
                            ?disabled=${!canEmulateNewPlatform}
                            @change=${(e: Event) => {
                                if (!canEmulateNewPlatform) return;
                                this.newPlatformEmulatableTouched = true;
                                this.newPlatformEmulatable = (e.target as HTMLInputElement).checked;
                            }}
                        />
                        Allow Emulation in Browser (WASM Libretro)
                    </label>
                    ${this.newPlatformName.trim() && !canEmulateNewPlatform ? html`
                        <div style="font-size: 0.8em; color: var(--color-text-secondary); margin-top: 4px;">
                            No Libretro WASM core is available for this platform.
                        </div>
                    ` : ''}
                </div>

                ${canEmulateNewPlatform && this.newPlatformEmulatable ? html`
                    <div style="margin-bottom: var(--spacing-md);">
                        <label style="display: block; margin-bottom: var(--spacing-xs); font-weight: bold; color: var(--color-text-secondary);">Libretro WASM Core</label>
                        <select
                            class="core-select"
                            style="width: 100%;"
                            .value=${this.newPlatformCore}
                            @change=${(e: Event) => {
                                this.newPlatformEmulatableTouched = true;
                                this.newPlatformCore = (e.target as HTMLSelectElement).value;
                            }}
                        >
                            <option value="">Auto-detect core</option>
                            ${map(newPlatformCores, core => html`
                                <option value=${core.id} ?selected=${this.newPlatformCore === core.id}>
                                    ${core.name} (${core.id})
                                </option>
                            `)}
                        </select>
                    </div>
                ` : ''}
            </form>
            
            <div slot="actions">
                <ui-button variant="secondary" @click=${this.closeAddPlatformDialog}>Cancel</ui-button>
                <ui-button variant="primary" type="submit" form="add-platform-form" ?disabled=${!this.newPlatformName.trim()}>Add Platform</ui-button>
            </div>
        </ui-dialog>
      </div>
    `;
  }
}
