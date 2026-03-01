import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type BadgeVariant = 'primary' | 'secondary' | 'accent' | 'error' | 'success';

@customElement('ui-badge')
export class UiBadge extends LitElement {
    static override styles = css`
        :host {
            display: inline-flex;
        }
        .badge {
            font-size: var(--font-size-xs, 10px);
            padding: 2px 6px;
            border-radius: var(--border-radius-sm, 4px);
            font-weight: var(--font-weight-medium, 500);
            white-space: nowrap;
            align-items: center;
            justify-content: center;
        }

        /* Variants */
        .variant-primary {
            background: var(--color-accent-primary);
            color: #fff;
        }
        .variant-secondary {
            background: var(--color-bg-tertiary);
            color: var(--color-text-secondary);
        }
        .variant-accent {
            background: rgba(245, 197, 24, 0.2);
            color: var(--color-accent-primary);
            border: 1px solid var(--color-accent-primary);
        }
        .variant-error {
            background: rgba(239, 68, 68, 0.2);
            color: var(--color-error);
        }
        .variant-success {
            background: rgba(34, 197, 94, 0.2);
            color: #22c55e;
        }
    `;

    @property({ type: String }) variant: BadgeVariant = 'secondary';

    override render() {
        return html`
            <span class="badge variant-${this.variant}">
                <slot></slot>
            </span>
        `;
    }
}
