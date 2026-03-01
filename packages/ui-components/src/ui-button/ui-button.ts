import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'error' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

@customElement('ui-button')
export class UiButton extends LitElement {
    static override styles = css`
        :host {
            display: inline-block;
        }
        
        .button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-family: inherit;
            font-weight: var(--font-weight-medium, 500);
            cursor: pointer;
            border: 1px solid transparent;
            transition: all 0.2s ease;
            gap: var(--spacing-sm, 8px);
            text-decoration: none;
            box-sizing: border-box;
            white-space: nowrap;
        }

        .button:disabled, .button.disabled {
            opacity: 0.5;
            cursor: not-allowed;
            pointer-events: none;
        }

        /* Sizes */
        .size-sm {
            padding: var(--spacing-xs, 4px) var(--spacing-sm, 8px);
            font-size: var(--font-size-sm, 12px);
            border-radius: var(--border-radius-sm, 4px);
        }
        .size-md {
            padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
            font-size: var(--font-size-base, 14px);
            border-radius: var(--border-radius-md, 6px);
        }
        .size-lg {
            padding: var(--spacing-md, 12px) var(--spacing-lg, 24px);
            font-size: var(--font-size-lg, 16px);
            border-radius: var(--border-radius-lg, 8px);
        }

        /* Variants */
        .variant-primary {
            background: var(--color-accent-primary, #646cff);
            color: #fff;
            border-color: var(--color-accent-primary, #646cff);
        }
        .variant-primary:hover:not(.disabled) {
            filter: brightness(1.1);
        }

        .variant-secondary {
            background: var(--color-bg-secondary, #2a2a2a);
            color: var(--color-text-primary, #fff);
            border-color: var(--border-color, #444);
        }
        .variant-secondary:hover:not(.disabled) {
            background: var(--color-bg-tertiary, #333);
        }

        .variant-accent {
            background: transparent;
            color: var(--color-accent-primary, #646cff);
            border-color: var(--color-accent-primary, #646cff);
        }
        .variant-accent:hover:not(.disabled) {
            background: rgba(100, 108, 255, 0.1);
        }

        .variant-error {
            background: transparent;
            color: var(--color-error, #ef4444);
            border-color: var(--color-error, #ef4444);
        }
        .variant-error:hover:not(.disabled) {
            background: var(--color-error, #ef4444);
            color: #fff;
        }

        .variant-ghost {
            background: transparent;
            color: var(--color-text-primary, #fff);
        }
        .variant-ghost:hover:not(.disabled) {
            background: rgba(255, 255, 255, 0.1);
        }
    `;

    @property({ type: String }) variant: ButtonVariant = 'primary';
    @property({ type: String }) size: ButtonSize = 'md';
    @property({ type: Boolean }) disabled = false;
    @property({ type: String }) type: 'button' | 'submit' | 'reset' = 'button';
    @property({ type: String }) href?: string;

    private clickHandler(e: Event) {
        if (this.type === 'submit') {
            e.preventDefault();
            this.closest('FORM')?.dispatchEvent(new Event('submit'))
        }
    }
    override render() {
        if (this.href) {
            return html`
                <a 
                    href=${this.href}
                    class="button variant-${this.variant} size-${this.size} ${this.disabled ? 'disabled' : ''}"
                    part="button"
                >
                    <slot></slot>
                </a>
            `;
        }
        
        return html`
            <button 
                type=${this.type}
                ?disabled=${this.disabled}
                class="button variant-${this.variant} size-${this.size}"
                part="button"
                @click=${this.clickHandler}
            >
                <slot></slot>
            </button>
        `;
    }
}
