import { LitElement, html, css, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';

export interface ColumnDef<T> {
  header: string;
  key: keyof T;
  render?: (item: T) => TemplateResult | string;
}

@customElement('data-table')
export class DataTable<T> extends LitElement {
  @property({ type: Array }) columns: ColumnDef<T>[] = [];
  @property({ type: Array }) data: T[] = [];

  static override styles = css`
    :host {
      display: block;
      width: 100%;
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--color-bg-secondary, #2A2A35);
      border-radius: var(--border-radius-md, 8px);
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    th, td {
      padding: var(--spacing-md, 16px);
      text-align: left;
      border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
    }
    th {
      background: var(--color-bg-tertiary, #3A3A4A);
      color: var(--color-text-secondary, #A0A0B0);
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
    }
    tr:last-child td {
      border-bottom: none;
    }
    tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }
    .empty-state {
      padding: var(--spacing-2xl, 32px);
      text-align: center;
      color: var(--color-text-tertiary, #808090);
      font-style: italic;
    }
  `;

  override render() {
    if (!this.columns || this.columns.length === 0) {
      return html`<div class="empty-state">No columns defined.</div>`;
    }

    if (!this.data || this.data.length === 0) {
      return html`
        <table>
          <thead>
            <tr>
              ${map(this.columns, (col: ColumnDef<T>) => html`<th>${col.header}</th>`)}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colspan="${this.columns.length}" class="empty-state">
                No data available.
              </td>
            </tr>
          </tbody>
        </table>
      `;
    }

    return html`
      <table>
        <thead>
          <tr>
            ${map(this.columns, (col: ColumnDef<T>) => html`<th>${col.header}</th>`)}
          </tr>
        </thead>
        <tbody>
          ${map(
            this.data,
            (item: T) => html`
              <tr>
                ${map(
                  this.columns,
                  (col: ColumnDef<T>) => html`
                    <td>
                      ${col.render ? col.render(item) : String(item[col.key] ?? '')}
                    </td>
                  `
                )}
              </tr>
            `
          )}
        </tbody>
      </table>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'data-table': DataTable<unknown>;
  }
}
