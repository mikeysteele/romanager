import { LitElement, html, css, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';

export interface ColumnDef<T> {
  header: string;
  key: keyof T;
  sortable?: boolean;
  render?: (item: T) => TemplateResult | string;
}

@customElement('data-table')
export class DataTable<T extends { id: string }> extends LitElement {
  @property({ type: Array }) declare columns: ColumnDef<T>[];
  @property({ type: Array }) declare data: T[];
  @property({ type: Boolean }) declare selectable: boolean;
  
  @state() private declare sortKey: keyof T | null;
  @state() private declare sortDirection: 'asc' | 'desc';
  @state() private declare selectedIds: Set<string>;

  constructor() {
    super();
    this.columns = [];
    this.data = [];
    this.selectable = false;
    this.sortKey = null;
    this.sortDirection = 'asc';
    this.selectedIds = new Set();
  }

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
      cursor: default;
    }
    th.sortable {
      cursor: pointer;
      user-select: none;
    }
    th.sortable:hover {
      color: var(--color-text-primary, #FFFFFF);
    }
    .sort-indicator {
      margin-left: 4px;
      font-size: 0.6rem;
    }
    tr:last-child td {
      border-bottom: none;
    }
    tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }
    tr.selected td {
      background: rgba(var(--color-accent-primary-rgb, 100, 100, 255), 0.1);
    }
    .empty-state {
      padding: var(--spacing-2xl, 32px);
      text-align: center;
      color: var(--color-text-tertiary, #808090);
      font-style: italic;
    }
    input[type="checkbox"] {
        cursor: pointer;
    }
  `;

  private handleSort(key: keyof T) {
      if (this.sortKey === key) {
          this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
          this.sortKey = key;
          this.sortDirection = 'asc';
      }
      this.requestUpdate();
  }

  private toggleSelectAll(e: Event) {
      const checked = (e.target as HTMLInputElement).checked;
      if (checked) {
          this.selectedIds = new Set(this.data.map(item => item.id));
      } else {
          this.selectedIds = new Set();
      }
      this.dispatchSelectionChange();
  }

  private toggleSelect(id: string) {
      if (this.selectedIds.has(id)) {
          this.selectedIds.delete(id);
      } else {
          this.selectedIds.add(id);
      }
      this.requestUpdate();
      this.dispatchSelectionChange();
  }

  private dispatchSelectionChange() {
      this.dispatchEvent(new CustomEvent('selection-change', {
          detail: { selectedIds: Array.from(this.selectedIds) },
          bubbles: true,
          composed: true
      }));
  }

  get sortedData() {
      if (!this.sortKey) return this.data;
      
      return [...this.data].sort((a, b) => {
          const aVal = a[this.sortKey!];
          const bVal = b[this.sortKey!];
          
          if (aVal === bVal) return 0;
          
          const comparison = aVal > bVal ? 1 : -1;
          return this.sortDirection === 'asc' ? comparison : -comparison;
      });
  }

  override render() {
    if (!this.columns || this.columns.length === 0) {
      return html`<div class="empty-state">No columns defined.</div>`;
    }

    const allSelected = this.data.length > 0 && this.selectedIds.size === this.data.length;

    return html`
      <table>
        <thead>
          <tr>
            ${this.selectable ? html`
              <th style="width: 40px;">
                <input type="checkbox" .checked=${allSelected} @change=${this.toggleSelectAll} />
              </th>
            ` : ''}
            ${map(this.columns, (col: ColumnDef<T>) => html`
              <th class="${col.sortable ? 'sortable' : ''}" @click=${() => col.sortable && this.handleSort(col.key)}>
                ${col.header}
                ${col.sortable && this.sortKey === col.key ? html`
                  <span class="sort-indicator">${this.sortDirection === 'asc' ? '▲' : '▼'}</span>
                ` : ''}
              </th>
            `)}
          </tr>
        </thead>
        <tbody>
          ${this.data.length === 0 ? html`
            <tr>
              <td colspan="${this.columns.length + (this.selectable ? 1 : 0)}" class="empty-state">
                No data available.
              </td>
            </tr>
          ` : map(
            this.sortedData,
            (item: T) => html`
              <tr class="${this.selectedIds.has(item.id) ? 'selected' : ''}">
                ${this.selectable ? html`
                  <td>
                    <input type="checkbox" .checked=${this.selectedIds.has(item.id)} @change=${() => this.toggleSelect(item.id)} />
                  </td>
                ` : ''}
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
    'data-table': DataTable<{ id: string } & Record<string, unknown>>;
  }
}
