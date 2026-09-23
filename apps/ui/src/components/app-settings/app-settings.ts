import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';

import '@repo/ui-components';

@customElement('app-settings')
export class AppSettings extends LitElement {
  static override styles = css`
    :host {
        display: block;
        max-width: 860px;
        margin: 0 auto;
        padding-bottom: var(--spacing-2xl, 40px);
    }

    .cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: var(--spacing-lg, 18px);
    }

    .card {
        background: var(--color-bg-secondary, #18181f);
        border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
        border-radius: var(--border-radius-lg, 12px);
        padding: var(--spacing-xl, 24px);
        text-decoration: none;
        color: var(--color-text-primary, #fff);
        transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
        display: flex;
        flex-direction: column;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
    }

    .card:hover {
        transform: translateY(-2px);
        border-color: var(--color-accent-primary, #f5c518);
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
    }

    .card-icon {
        font-size: 1.75rem;
        margin-bottom: var(--spacing-md, 14px);
    }

    .card h2 {
        margin: 0 0 8px 0;
        font-size: 1.15rem;
        font-weight: 600;
        color: var(--color-accent-primary, #f5c518);
    }

    .card p {
        margin: 0;
        color: var(--color-text-secondary, #aaa);
        line-height: 1.5;
        font-size: 0.9rem;
    }
  `;

  override render() {
    return html`
        <ui-page-header
            heading="Settings"
            subtitle="Configure library storage paths, manage platforms and BIOS firmware, and customize scanner rules."
            .breadcrumbs=${[
                { label: 'Settings' }
            ]}
        ></ui-page-header>

        <div class="cards">
          <a href="/settings/rom-management" class="card">
            <span class="card-icon">🗂️</span>
            <h2>ROM Management</h2>
            <p>Configure the root directory where your ROM files are stored, browse folders, and manage staging queues.</p>
          </a>
          <a href="/settings/platforms" class="card">
            <span class="card-icon">🎮</span>
            <h2>Platforms & Firmware</h2>
            <p>Administer emulation platforms, define core paths, and map required BIOS/firmware files for emulation.</p>
          </a>
          <a href="/settings/file-types" class="card">
            <span class="card-icon">🏷️</span>
            <h2>File Types Whitelist</h2>
            <p>Configure whitelisted ROM & BIOS file extensions and optional magic-number signatures for scanning.</p>
          </a>
        </div>
      </div>
    `;
  }
}
