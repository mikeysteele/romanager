import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('ui-tab-panel')
export class UiTabPanel extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }
    :host([hidden]) {
      display: none !important;
    }
  `;

  /**
   * The name of the tab this panel belongs to. This must match the
   * string generated in the <ui-tabs> bar.
   */
  @property({ type: String, reflect: true }) name = '';
  
  /**
   * Controlled by the parent <ui-tabs> to indicate visibility.
   */
  @property({ type: Boolean, reflect: true }) override hidden = true;

  override render() {
    return html`<slot></slot>`;
  }
}
