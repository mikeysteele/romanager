import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

@customElement('app-settings')
export class AppSettings extends LitElement {
  static override styles = css`
    :host {
        display: block;
        max-width: 600px;
        margin: 0 auto;
    }
    h1 {
        margin-bottom: var(--spacing-xl);
    }
    .settings-container {
        background: var(--color-bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-lg);
        padding: var(--spacing-2xl);
    }
    .form-group {
        margin-bottom: var(--spacing-xl);
    }
    label {
        display: block;
        margin-bottom: var(--spacing-sm);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-secondary);
    }
    input[type="text"] {
        width: 100%;
        padding: var(--spacing-md);
        background: var(--color-bg-tertiary);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-sm);
        color: var(--color-text-primary);
        font-size: var(--font-size-base);
        transition: border-color var(--transition-fast);
    }
    input[type="text"]:focus {
        outline: none;
        border-color: var(--color-accent-primary);
        box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
    }
    .actions {
        margin-top: var(--spacing-xl);
        text-align: center;
    }
    }
  `;

  @state() message: string = '';
  @state() loading: boolean = false;
  @state() romsDir: string = '';

  override connectedCallback() {
      super.connectedCallback();
      this.fetchSettings();
  }

  async fetchSettings() {
    try {
      this.loading = true;
      const res = await fetch('/api/settings');
      if (res.ok) {
        const settings = await res.json();
        const romDirSetting = settings.find((s: { key: string; value: string }) => s.key === 'roms_dir');
        if (romDirSetting) {
          this.romsDir = romDirSetting.value;
        }
      }
    } catch (e) {
      console.error('Error fetching settings', e);
    } finally {
      this.loading = false;
    }
  }

  async saveSettings(e: Event) {
    e.preventDefault();
    try {
      this.loading = true;
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'roms_dir', value: this.romsDir }),
      });
      alert('Settings saved. Scan started in background.');
    } catch (err) {
      console.error('Failed to save settings', err);
      alert('Error saving settings');
    } finally {
      this.loading = false;
    }
  }

  handleInput(e: Event) {
    this.romsDir = (e.target as HTMLInputElement).value;
  }

  override render() {
    return html`
      <div class="settings-container">
        <h1>Settings</h1>
        <form @submit=${(e: SubmitEvent) => this.saveSettings(e)}>
          <div class="form-group">
            <label for="roms-dir">ROMs Directory</label>
            <input
              type="text"
              id="roms-dir"
              .value=${this.romsDir}
              @input=${(e: Event) => this.handleInput(e)}
              placeholder="/path/to/roms"
            />
          </div>
          <ui-button type="submit" variant="primary" ?disabled=${this.loading}>
            ${this.loading ? 'Saving...' : 'Save & Scan'}
          </ui-button>
        </form>

        <div class="actions">
              <ui-button variant="secondary" href="/">Back to Library</ui-button>
        </div>
      </div>
    `;
  }
}
