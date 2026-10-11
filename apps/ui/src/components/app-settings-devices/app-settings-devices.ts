import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { toast } from '@repo/ui-components';
import '@repo/ui-components';
import type { Device, Manifest, ProfileRule } from '@repo/shared';

@customElement('app-settings-devices')
export class AppSettingsDevices extends LitElement {
  static override styles = css`
    :host {
      display: block;
      max-width: 960px;
      margin: 0 auto;
      padding-bottom: var(--spacing-2xl, 40px);
    }

    .top-actions {
      display: flex;
      justify-content: flex-end;
      margin-bottom: var(--spacing-lg, 16px);
    }

    .devices-grid {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md, 16px);
    }

    .device-card {
      background: var(--color-bg-secondary, #18181f);
      border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
      border-radius: var(--border-radius-lg, 12px);
      padding: var(--spacing-xl, 20px);
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md, 14px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    }

    .device-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }

    .device-title-area {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .device-icon {
      font-size: 1.6rem;
    }

    .device-name {
      font-size: 1.2rem;
      font-weight: 600;
      color: #fff;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .badge-batocera {
      background: rgba(33, 150, 243, 0.15);
      color: #64b5f6;
      border: 1px solid rgba(33, 150, 243, 0.3);
    }

    .badge-esde {
      background: rgba(156, 39, 176, 0.15);
      color: #ba68c8;
      border: 1px solid rgba(156, 39, 176, 0.3);
    }

    .badge-retropie {
      background: rgba(244, 67, 54, 0.15);
      color: #e57373;
      border: 1px solid rgba(244, 67, 54, 0.3);
    }

    .meta-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
      background: rgba(0, 0, 0, 0.2);
      padding: 12px 16px;
      border-radius: var(--border-radius-md, 8px);
      font-size: 0.85rem;
    }

    .meta-label {
      color: var(--color-text-secondary, #888);
      margin-bottom: 2px;
      font-size: 0.75rem;
      text-transform: uppercase;
    }

    .meta-value {
      color: #eee;
      font-weight: 500;
    }

    .card-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      flex-wrap: wrap;
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      background: var(--color-bg-secondary, #18181f);
      border: 1px dashed var(--border-color, rgba(255, 255, 255, 0.1));
      border-radius: var(--border-radius-lg, 12px);
      color: var(--color-text-secondary, #aaa);
    }

    dialog {
      background: var(--color-bg-secondary, #18181f);
      color: var(--color-text-primary, #fff);
      border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
      border-radius: var(--border-radius-lg, 12px);
      padding: 24px;
      max-width: 600px;
      width: 90%;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    }

    dialog::backdrop {
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 16px;
    }

    .form-group label {
      font-size: 0.85rem;
      font-weight: 500;
      color: #ccc;
    }

    .form-group input, .form-group select {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--border-color, rgba(255, 255, 255, 0.15));
      border-radius: 6px;
      padding: 10px 12px;
      color: #fff;
      font-size: 0.95rem;
    }

    .form-group input:focus, .form-group select:focus {
      outline: none;
      border-color: var(--color-accent-primary, #f5c518);
    }

    .checkbox-group {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 14px;
    }

    .checkbox-group input {
      width: 18px;
      height: 18px;
      accent-color: var(--color-accent-primary, #f5c518);
    }

    .code-box {
      background: #0d0d12;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 14px;
      font-family: monospace;
      font-size: 0.85rem;
      color: #4fc3f7;
      word-break: break-all;
      user-select: all;
      margin: 14px 0;
    }

    .rules-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 10px;
      max-height: 250px;
      overflow-y: auto;
    }

    .rule-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.05);
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 0.85rem;
    }

    .manifest-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 16px;
    }

    .manifest-stat-card {
      background: rgba(0, 0, 0, 0.3);
      padding: 10px;
      border-radius: 6px;
      text-align: center;
    }

    .manifest-sets-list {
      max-height: 300px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .manifest-set-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 4px;
      font-size: 0.85rem;
    }
  `;

  @state() devices: Device[] = [];
  @state() loading: boolean = false;

  // Add Device Dialog
  @state() showAddModal: boolean = false;
  @state() newDeviceName: string = '';
  @state() newDevicePreset: 'batocera' | 'esde' | 'retropie' = 'batocera';
  @state() newDeviceBudgetGb: number | null = null;

  // Enrollment Key Dialog
  @state() showEnrollModal: boolean = false;
  @state() enrolledKey: string = '';
  @state() enrolledDeviceName: string = '';

  // Edit Profile Dialog
  @state() showEditModal: boolean = false;
  @state() editingDevice: Device | null = null;
  @state() editRegionPref: string = 'USA,EUR,JPN';
  @state() editOneRomPerGame: boolean = false;
  @state() editIncludeFirmware: boolean = true;
  @state() editBudgetGb: number | null = null;
  @state() editRules: ProfileRule[] = [];

  // Add rule state
  @state() newRuleKind: ProfileRule['kind'] = 'include_system';
  @state() newRuleTargetId: string = '';

  // Manifest Preview Dialog
  @state() showManifestModal: boolean = false;
  @state() previewManifest: Manifest | null = null;
  @state() previewDeviceName: string = '';

  override connectedCallback() {
    super.connectedCallback();
    this.fetchDevices();
  }

  async fetchDevices() {
    this.loading = true;
    try {
      const res = await fetch('/api/devices');
      if (res.ok) {
        this.devices = await res.json();
      }
    } catch (e) {
      toast(`Failed to load devices: ${e}`, 'error');
    } finally {
      this.loading = false;
    }
  }

  async handleAddDevice(e: Event) {
    e.preventDefault();
    if (!this.newDeviceName.trim()) return;

    try {
      const budgetBytes =
        this.newDeviceBudgetGb && this.newDeviceBudgetGb > 0
          ? Math.round(this.newDeviceBudgetGb * 1024 * 1024 * 1024)
          : null;

      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: this.newDeviceName.trim(),
          preset: this.newDevicePreset,
          storageBudgetBytes: budgetBytes,
          profile: {
            regionPreference: 'USA,EUR,JPN',
            oneRomPerGame: false,
            includeFirmware: true,
          },
        }),
      });

      if (!res.ok) {
        throw new Error((await res.json()).error || 'Failed to create device');
      }

      const data = await res.json();
      this.showAddModal = false;
      this.newDeviceName = '';

      // Open enrollment modal
      this.enrolledKey = data.apiKey.rawKey;
      this.enrolledDeviceName = data.device.name;
      this.showEnrollModal = true;

      await this.fetchDevices();
      toast(`Device '${data.device.name}' added successfully!`, 'success');
    } catch (e) {
      toast(`Error adding device: ${e}`, 'error');
    }
  }

  async handleOpenEdit(device: Device) {
    try {
      const res = await fetch(`/api/devices/${device.id}`);
      if (!res.ok) throw new Error('Failed to load device details');
      const data = await res.json();

      this.editingDevice = data;
      this.editRegionPref = data.profile?.regionPreference || 'USA,EUR,JPN';
      this.editOneRomPerGame = !!data.profile?.oneRomPerGame;
      this.editIncludeFirmware = data.profile?.includeFirmware !== false;
      this.editBudgetGb = data.storageBudgetBytes
        ? Number((data.storageBudgetBytes / (1024 * 1024 * 1024)).toFixed(1))
        : null;
      this.editRules = data.profile?.rules || [];
      this.showEditModal = true;
    } catch (e) {
      toast(`Could not load device details: ${e}`, 'error');
    }
  }

  async handleSaveEdit(e: Event) {
    e.preventDefault();
    if (!this.editingDevice) return;

    try {
      const budgetBytes =
        this.editBudgetGb && this.editBudgetGb > 0
          ? Math.round(this.editBudgetGb * 1024 * 1024 * 1024)
          : null;

      // 1. Update device and profile
      await fetch(`/api/devices/${this.editingDevice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: this.editingDevice.name,
          preset: this.editingDevice.preset,
          storageBudgetBytes: budgetBytes,
          profile: {
            regionPreference: this.editRegionPref,
            oneRomPerGame: this.editOneRomPerGame,
            includeFirmware: this.editIncludeFirmware,
          },
        }),
      });

      // 2. Update rules
      await fetch(`/api/devices/${this.editingDevice.id}/rules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rules: this.editRules.map((r, i) => ({
            kind: r.kind,
            targetId: r.targetId,
            position: i,
          })),
        }),
      });

      this.showEditModal = false;
      await this.fetchDevices();
      toast('Device profile and rules saved!', 'success');
    } catch (e) {
      toast(`Error saving profile: ${e}`, 'error');
    }
  }

  handleAddRule() {
    if (!this.newRuleTargetId.trim()) return;
    this.editRules = [
      ...this.editRules,
      {
        kind: this.newRuleKind,
        targetId: this.newRuleTargetId.trim(),
        position: this.editRules.length,
      },
    ];
    this.newRuleTargetId = '';
  }

  handleRemoveRule(index: number) {
    this.editRules = this.editRules.filter((_, i) => i !== index);
  }

  handleMoveRule(index: number, direction: 'up' | 'down') {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= this.editRules.length) return;

    const list = [...this.editRules];
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    this.editRules = list;
  }

  async handlePreviewManifest(device: Device) {
    try {
      const res = await fetch(`/api/devices/${device.id}/manifest/preview`);
      if (!res.ok) throw new Error('Failed to preview manifest');
      this.previewManifest = await res.json();
      this.previewDeviceName = device.name;
      this.showManifestModal = true;
    } catch (e) {
      toast(`Could not preview manifest: ${e}`, 'error');
    }
  }

  async handleDeleteDevice(device: Device) {
    if (!confirm(`Are you sure you want to delete device '${device.name}'? This will revoke all its API keys.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/devices/${device.id}`, { method: 'DELETE' });
      if (res.ok) {
        await this.fetchDevices();
        toast(`Device '${device.name}' deleted`, 'success');
      }
    } catch (e) {
      toast(`Error deleting device: ${e}`, 'error');
    }
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast('Copied to clipboard!', 'success');
  }

  formatBytes(bytes: number | null | undefined): string {
    if (!bytes || bytes <= 0) return 'Unlimited';
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  override render() {
    return html`
      <ui-page-header
        heading="Devices & Sync"
        subtitle="Manage enrolled companion devices, configure sync profiles and filtering rules, and monitor sync status."
        .breadcrumbs=${[{ label: 'Settings', href: '/settings' }, { label: 'Devices' }]}
      ></ui-page-header>

      <div class="top-actions">
        <ui-button variant="primary" @click=${() => (this.showAddModal = true)}>
          + Add Device
        </ui-button>
      </div>

      ${this.devices.length === 0
        ? html`
            <div class="empty-state">
              <h2>No Devices Enrolled</h2>
              <p>Enroll a handheld or console running Batocera, ES-DE, or RetroPie to keep your ROMs in sync.</p>
              <br />
              <ui-button variant="primary" @click=${() => (this.showAddModal = true)}>
                + Enroll First Device
              </ui-button>
            </div>
          `
        : html`
            <div class="devices-grid">
              ${this.devices.map(
                (dev) => html`
                  <div class="device-card">
                    <div class="device-header">
                      <div class="device-title-area">
                        <span class="device-icon">📱</span>
                        <span class="device-name">${dev.name}</span>
                        <span class="badge badge-${dev.preset}">${dev.preset}</span>
                      </div>
                      <div class="card-actions">
                        <ui-button variant="secondary" size="small" @click=${() => this.handlePreviewManifest(dev)}>
                          Manifest Preview
                        </ui-button>
                        <ui-button variant="secondary" size="small" @click=${() => this.handleOpenEdit(dev)}>
                          Edit Profile
                        </ui-button>
                        <ui-button variant="danger" size="small" @click=${() => this.handleDeleteDevice(dev)}>
                          Delete
                        </ui-button>
                      </div>
                    </div>

                    <div class="meta-row">
                      <div>
                        <div class="meta-label">Last Seen</div>
                        <div class="meta-value">${dev.lastSeenAt ? new Date(dev.lastSeenAt).toLocaleString() : 'Never'}</div>
                      </div>
                      <div>
                        <div class="meta-label">Last Sync</div>
                        <div class="meta-value">${dev.lastSyncAt ? new Date(dev.lastSyncAt).toLocaleString() : 'Never'}</div>
                      </div>
                      <div>
                        <div class="meta-label">Agent Version</div>
                        <div class="meta-value">${dev.agentVersion || 'N/A'}</div>
                      </div>
                      <div>
                        <div class="meta-label">Storage Budget</div>
                        <div class="meta-value">${this.formatBytes(dev.storageBudgetBytes)}</div>
                      </div>
                    </div>
                  </div>
                `
              )}
            </div>
          `}

      <!-- Add Device Modal -->
      ${this.showAddModal
        ? html`
            <dialog open>
              <h2>Add New Companion Device</h2>
              <form @submit=${this.handleAddDevice}>
                <div class="form-group">
                  <label>Device Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Living Room Batocera"
                    .value=${this.newDeviceName}
                    @input=${(e: Event) => (this.newDeviceName = (e.target as HTMLInputElement).value)}
                  />
                </div>

                <div class="form-group">
                  <label>Frontend Preset</label>
                  <select
                    .value=${this.newDevicePreset}
                    @change=${(e: Event) => (this.newDevicePreset = (e.target as HTMLSelectElement).value as 'batocera' | 'esde' | 'retropie')}
                  >
                    <option value="batocera">Batocera (/userdata/roms)</option>
                    <option value="esde">ES-DE (~/ROMs)</option>
                    <option value="retropie">RetroPie (~/RetroPie/roms)</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>Storage Budget Limit (GB, optional)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="Leave empty for unlimited"
                    .value=${this.newDeviceBudgetGb || ''}
                    @input=${(e: Event) => {
                      const val = (e.target as HTMLInputElement).value;
                      this.newDeviceBudgetGb = val ? Number(val) : null;
                    }}
                  />
                </div>

                <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:20px;">
                  <ui-button variant="secondary" type="button" @click=${() => (this.showAddModal = false)}>
                    Cancel
                  </ui-button>
                  <ui-button variant="primary" type="submit">
                    Create & Generate Key
                  </ui-button>
                </div>
              </form>
            </dialog>
          `
        : ''}

      <!-- Enrollment Modal -->
      ${this.showEnrollModal
        ? html`
            <dialog open>
              <h2>Device Enrolled: ${this.enrolledDeviceName}</h2>
              <p style="color:#aaa; font-size:0.9rem;">
                Run this command on your device to complete setup. <strong>This key will only be shown once!</strong>
              </p>

              <div class="code-box">
                romanager-sync init --server ${globalThis.location.origin} --key ${this.enrolledKey}
              </div>

              <div style="display:flex; justify-content:space-between; margin-top:20px;">
                <ui-button
                  variant="secondary"
                  @click=${() =>
                    this.copyToClipboard(
                      `romanager-sync init --server ${globalThis.location.origin} --key ${this.enrolledKey}`
                    )}
                >
                  📋 Copy Command
                </ui-button>
                <ui-button variant="primary" @click=${() => (this.showEnrollModal = false)}>
                  Done
                </ui-button>
              </div>
            </dialog>
          `
        : ''}

      <!-- Edit Profile & Rules Modal -->
      ${this.showEditModal && this.editingDevice
        ? html`
            <dialog open style="max-width: 680px;">
              <h2>Edit Profile: ${this.editingDevice.name}</h2>
              <form @submit=${this.handleSaveEdit}>
                <div class="form-group">
                  <label>Device Name</label>
                  <input
                    type="text"
                    required
                    .value=${this.editingDevice.name}
                    @input=${(e: Event) => (this.editingDevice!.name = (e.target as HTMLInputElement).value)}
                  />
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                  <div class="form-group">
                    <label>Region Preference (order of priority)</label>
                    <input
                      type="text"
                      placeholder="USA,EUR,JPN"
                      .value=${this.editRegionPref}
                      @input=${(e: Event) => (this.editRegionPref = (e.target as HTMLInputElement).value)}
                    />
                  </div>

                  <div class="form-group">
                    <label>Storage Budget (GB)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="Unlimited"
                      .value=${this.editBudgetGb || ''}
                      @input=${(e: Event) => {
                        const val = (e.target as HTMLInputElement).value;
                        this.editBudgetGb = val ? Number(val) : null;
                      }}
                    />
                  </div>
                </div>

                <div class="checkbox-group">
                  <input
                    type="checkbox"
                    id="oneRom"
                    .checked=${this.editOneRomPerGame}
                    @change=${(e: Event) => (this.editOneRomPerGame = (e.target as HTMLInputElement).checked)}
                  />
                  <label for="oneRom">One ROM Per Game (deduplicate versions by region preference)</label>
                </div>

                <div class="checkbox-group">
                  <input
                    type="checkbox"
                    id="includeFw"
                    .checked=${this.editIncludeFirmware}
                    @change=${(e: Event) => (this.editIncludeFirmware = (e.target as HTMLInputElement).checked)}
                  />
                  <label for="includeFw">Include BIOS & System Firmware</label>
                </div>

                <h3 style="margin: 18px 0 6px 0; font-size:1rem; color:var(--color-accent-primary);">
                  Sync Filtering Rules (Applied in Order)
                </h3>

                <div class="rules-list">
                  ${this.editRules.length === 0
                    ? html`<div style="color:#777; font-size:0.85rem;">No rules defined (all complete sets will sync).</div>`
                    : this.editRules.map(
                        (r, i) => html`
                          <div class="rule-item">
                            <span>
                              <strong>#${i + 1}</strong>
                              <span style="color:#ffb74d; margin:0 8px;">${r.kind}</span>
                              <code>${r.targetId}</code>
                            </span>
                            <div style="display:flex; gap:4px;">
                              <button type="button" @click=${() => this.handleMoveRule(i, 'up')} ?disabled=${i === 0}>▲</button>
                              <button type="button" @click=${() => this.handleMoveRule(i, 'down')} ?disabled=${i === this.editRules.length - 1}>▼</button>
                              <button type="button" style="color:#e57373;" @click=${() => this.handleRemoveRule(i)}>✕</button>
                            </div>
                          </div>
                        `
                      )}
                </div>

                <div style="display:flex; gap:8px; margin-top:12px; align-items:center;">
                  <select
                    style="flex:1;"
                    .value=${this.newRuleKind}
                    @change=${(e: Event) => (this.newRuleKind = (e.target as HTMLSelectElement).value as ProfileRule['kind'])}
                  >
                    <option value="include_system">Include System (target = systemId)</option>
                    <option value="exclude_system">Exclude System (target = systemId)</option>
                    <option value="include_game">Include Game (target = gameId)</option>
                    <option value="exclude_game">Exclude Game (target = gameId)</option>
                    <option value="include_rom">Include ROM (target = romId)</option>
                    <option value="exclude_rom">Exclude ROM (target = romId)</option>
                  </select>
                  <input
                    type="text"
                    style="flex:1;"
                    placeholder="Target ID"
                    .value=${this.newRuleTargetId}
                    @input=${(e: Event) => (this.newRuleTargetId = (e.target as HTMLInputElement).value)}
                  />
                  <ui-button variant="secondary" size="small" type="button" @click=${this.handleAddRule}>
                    + Add
                  </ui-button>
                </div>

                <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:24px;">
                  <ui-button variant="secondary" type="button" @click=${() => (this.showEditModal = false)}>
                    Cancel
                  </ui-button>
                  <ui-button variant="primary" type="submit">
                    Save Profile & Rules
                  </ui-button>
                </div>
              </form>
            </dialog>
          `
        : ''}

      <!-- Manifest Preview Modal -->
      ${this.showManifestModal && this.previewManifest
        ? html`
            <dialog open style="max-width: 720px;">
              <h2>Manifest Preview: ${this.previewDeviceName}</h2>
              <div class="manifest-stats">
                <div class="manifest-stat-card">
                  <div class="meta-label">Sets Included</div>
                  <div style="font-size:1.2rem; font-weight:bold;">${this.previewManifest.sets.length}</div>
                </div>
                <div class="manifest-stat-card">
                  <div class="meta-label">Total Size</div>
                  <div style="font-size:1.2rem; font-weight:bold;">${this.formatBytes(this.previewManifest.totalBytes)}</div>
                </div>
                <div class="manifest-stat-card">
                  <div class="meta-label">Version Hash</div>
                  <div style="font-family:monospace; font-size:0.85rem; color:#f5c518;">
                    ${this.previewManifest.version.slice(0, 10)}...
                  </div>
                </div>
              </div>

              ${this.previewManifest.overBudget
                ? html`<div style="color:#ff5252; margin-bottom:10px; font-weight:600;">⚠️ Storage budget exceeded! Output truncated to fit.</div>`
                : ''}

              <div class="manifest-sets-list">
                ${this.previewManifest.sets.map(
                  (s) => html`
                    <div class="manifest-set-row">
                      <span><strong>[${s.esFolder}]</strong> ${s.name}</span>
                      <span style="color:#aaa; font-family:monospace;">${this.formatBytes(s.totalSize)}</span>
                    </div>
                  `
                )}
              </div>

              <div style="display:flex; justify-content:flex-end; margin-top:20px;">
                <ui-button variant="primary" @click=${() => (this.showManifestModal = false)}>
                  Close
                </ui-button>
              </div>
            </dialog>
          `
        : ''}
    `;
  }
}
