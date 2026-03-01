import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('app-header')
export class AppHeader extends LitElement {
  static override styles = css`
    :host {
      display: block;
      width: 100%;
    }
    header {
       height: 64px;
       background: var(--color-bg-glass);
       backdrop-filter: blur(10px);
       border-bottom: 1px solid var(--border-color);
       display: flex;
       align-items: center;
       justify-content: space-between;
       padding: 0 var(--spacing-xl);
       flex-shrink: 0;
    }

    .brand {
      height: 64px;
      display: flex;
      align-items: center;
    }

    .brand h1 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-accent-primary, #f5c518);
      letter-spacing: -0.02em;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .brand h1 a {
      color: inherit;
      text-decoration: none;
    }

    .search-bar {
        display: flex;
        align-items: center;
        background: rgba(255,255,255,0.05);
        border-radius: var(--border-radius-md);
        padding: 8px 16px;
        width: 300px;
        color: var(--color-text-secondary);
    }

    .actions {
        display: flex;
        gap: 1rem;
        color: var(--color-text-secondary);
    }
  `;

  override render() {
    return html`
    <header class="top-bar">
      <div class="brand">
        <h1><a href="/">Romanager</a></h1>
      </div> 
      <div class="search-bar">
        <span>🔍 Search...</span>
      </div>
      <div class="actions">
          <!-- Placeholder for top right actions (profile, etc) -->
          <span>❤️</span>
          <span>A - Z</span>
      </div>
    </header>
    `;
  }
}
