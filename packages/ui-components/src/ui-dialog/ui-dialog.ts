import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';

@customElement('ui-dialog')
export class UiDialog extends LitElement {
    static override styles = css`
        *, *::before, *::after {
            box-sizing: border-box;
        }

        dialog {
            box-sizing: border-box;
            background: var(--color-bg-secondary, #1e1e1e);
            color: var(--color-text-primary, #ececec);
            border: 1px solid var(--border-color, #444);
            border-radius: var(--border-radius-lg, 8px);
            padding: 0;
            width: calc(100% - var(--spacing-2xl, 48px));
            max-width: var(--ui-dialog-max-width, 500px);
            max-height: calc(100vh - var(--spacing-2xl, 48px));
            box-shadow: var(--shadow-2xl, 0 25px 50px -12px rgba(0, 0, 0, 0.5));
            transition: opacity 0.2s ease, transform 0.2s ease;
            overflow: hidden;
        }
        
        dialog::backdrop {
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            transition: opacity 0.2s ease;
        }

        .container {
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            padding: var(--spacing-xl, 24px);
            max-height: calc(100vh - var(--spacing-2xl, 48px));
            overflow-y: auto;
            overflow-x: hidden;
        }

        .header {
            margin-bottom: var(--spacing-md, 16px);
        }

        .header ::slotted(h1),
        .header ::slotted(h2),
        .header ::slotted(h3),
        .header ::slotted(h4) {
            margin: 0;
            font-size: var(--font-size-xl, 20px);
            font-weight: var(--font-weight-semibold, 600);
        }

        .content {
            font-size: var(--font-size-base, 14px);
            line-height: 1.5;
            color: var(--color-text-secondary, #a0a0a0);
        }
        
        .content ::slotted(p:first-child) {
            margin-top: 0;
        }

        .content ::slotted(p:last-child) {
            margin-bottom: 0;
        }

        .actions {
            display: flex;
            justify-content: flex-end;
            gap: var(--spacing-md, 12px);
            margin-top: var(--spacing-xl, 24px);
            padding-top: var(--spacing-lg, 16px);
        }
        
        /* Utility class to hide empty slots from displaying margins/padding */
        .actions-empty {
            display: none;
        }
    `;

    @query('dialog')
    private dialogElement!: HTMLDialogElement;

    @property({ type: Boolean }) declare open: boolean;
    @property({ type: String }) declare heading: string;

    constructor() {
        super();
        this.open = false;
        this.heading = '';
    }

    override updated(changedProperties: PropertyValues<this>) {
        if (changedProperties.has('open') && this.dialogElement) {
            if (this.open && !this.dialogElement.open) {
                if (typeof this.dialogElement.showModal === 'function') {
                    this.dialogElement.showModal();
                } else {
                    this.dialogElement.open = true;
                }
            } else if (!this.open && this.dialogElement.open) {
                if (typeof this.dialogElement.close === 'function') {
                    this.dialogElement.close();
                } else {
                    this.dialogElement.open = false;
                }
            }
        }
    }

    private handleBackdropClick(e: MouseEvent) {
        if (e.target === this.dialogElement) {
            this.handleClose();
        }
    }

    private handleClose() {
        this.open = false;
        // Allows consumers to handle the close action outside this component (e.g. updating states)
        this.dispatchEvent(new CustomEvent('ui-dialog-close', { bubbles: true, composed: true }));
    }

    override render() {
        return html`
            <dialog @click=${this.handleBackdropClick} @close=${this.handleClose}>
                <div class="container">
                    <div class="header">
                        <slot name="header">${this.heading ? html`<h2>${this.heading}</h2>` : ''}</slot>
                    </div>
                    <div class="content">
                        <slot></slot>
                    </div>
                    <!-- Actions slot for buttons (supports both name="actions" and name="footer") -->
                    <div class="actions">
                        <slot name="actions"></slot>
                        <slot name="footer"></slot>
                    </div>
                </div>
            </dialog>
        `;
    }
}
