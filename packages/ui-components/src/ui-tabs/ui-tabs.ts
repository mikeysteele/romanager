import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('ui-tabs')
export class UiTabs extends LitElement {
  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      width: 100%;
    }
    .tabs-header {
      display: flex;
      gap: 2px;
      margin-bottom: var(--spacing-md);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      overflow-x: auto;
      overflow-y: hidden;
    }
    .tabs-content {
      display: block;
    }
    .tab {
       position: relative;
       display: inline-block;
    }
    .tab::part(button) {
      background: transparent;
      color: var(--color-text-secondary);
      border: none;
      padding: var(--spacing-sm) var(--spacing-lg);
      font-size: 0.95rem;
      font-weight: 500;
      cursor: pointer;
      border-radius: 0;
      transition: color 0.2s ease;
      white-space: nowrap;
    }
    .tab:hover::part(button) {
      color: var(--color-text-primary);
      background: transparent;
    }
    .tab.active::part(button) {
      color: var(--accent-color, #f5c518);
    }
    .tab.active::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--accent-color, #f5c518);
    }
  `;

  @property({ type: Array }) tabs: string[] = [];
  @property({ type: String }) activeTab: string | null = null;
  @state() private _panels: Element[] = [];

  private _onTabClick(tab: string) {
    this.activeTab = tab;
    this._updatePanels();
    this.dispatchEvent(new CustomEvent('tab-changed', {
      detail: { tab },
      bubbles: true,
      composed: true
    }));
  }

  private _handleSlotChange(e: Event) {
      const slot = e.target as HTMLSlotElement;
      const assigned = slot.assignedElements({ flatten: true });
      this._panels = assigned.filter(el => el.tagName.toLowerCase() === 'ui-tab-panel');
      
      const newTabs = this._panels.map(p => p.getAttribute('name') || '');
      // Only update if tabs actually changed to prevent infinite loops
      if (JSON.stringify(this.tabs) !== JSON.stringify(newTabs)) {
          this.tabs = newTabs;
          if (!this.activeTab && this.tabs.length > 0) {
              this.activeTab = this.tabs[0];
          }
           this._updatePanels();
      }
  }

  private _updatePanels() {
      this._panels.forEach(panel => {
          const name = panel.getAttribute('name');
          if (name === this.activeTab) {
              panel.removeAttribute('hidden');
          } else {
              panel.setAttribute('hidden', '');
          }
      });
  }

  override updated(changedProperties: Map<string, unknown>) {
      if (changedProperties.has('activeTab')) {
          this._updatePanels();
      }
  }

  override render() {
    return html`
      <div class="tabs-header">
        ${this.tabs.map(tab => html`
          <ui-button 
            variant="ghost"
            class="tab ${this.activeTab === tab ? 'active' : ''}" 
            @click=${() => this._onTabClick(tab)}
          >
            ${tab}
          </ui-button>
        `)}
      </div>
      <div class="tabs-content">
          <slot @slotchange=${this._handleSlotChange}></slot>
      </div>
    `;
  }
}
