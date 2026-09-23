import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

@customElement('ui-toast')
export class UiToast extends LitElement {
    @property({ type: String }) message = '';
    @property({ type: String }) type: ToastType = 'info';
    @property({ type: Number }) duration = 5000;

    static override styles = css`
        :host {
            display: block;
            margin-bottom: var(--spacing-sm);
            pointer-events: auto;
        }
        .toast {
            display: flex;
            align-items: center;
            padding: var(--spacing-md) var(--spacing-lg);
            border-radius: var(--border-radius-md);
            background: var(--color-bg-tertiary);
            color: var(--color-text-primary);
            box-shadow: var(--shadow-lg);
            border-left: 4px solid var(--color-accent-primary);
            min-width: 300px;
            max-width: 450px;
            animation: slideIn 0.3s ease forwards;
            position: relative;
            overflow: hidden;
        }
        .toast.success { border-left-color: var(--color-success); }
        .toast.error { border-left-color: var(--color-error); }
        .toast.warning { border-left-color: var(--color-warning); }
        
        .message {
            flex: 1;
            font-size: var(--font-size-sm);
            font-weight: var(--font-weight-medium);
        }
        
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }

        .close {
            margin-left: var(--spacing-md);
            background: none;
            border: none;
            color: var(--color-text-tertiary);
            cursor: pointer;
            font-size: 1.2rem;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 4px;
        }
        .close:hover { color: var(--color-text-primary); }

        .progress {
            position: absolute;
            bottom: 0;
            left: 0;
            height: 2px;
            background: rgba(255, 255, 255, 0.2);
            width: 100%;
            transform-origin: left;
            animation: progress linear forwards;
        }
        @keyframes progress {
            from { transform: scaleX(1); }
            to { transform: scaleX(0); }
        }
    `;

    override firstUpdated() {
        if (this.duration > 0) {
            setTimeout(() => this.close(), this.duration);
        }
    }

    close() {
        this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
    }

    override render() {
        return html`
            <div class="toast ${this.type}">
                <div class="message">${this.message}</div>
                <button class="close" @click=${this.close}>&times;</button>
                ${this.duration > 0 ? html`<div class="progress" style="animation-duration: ${this.duration}ms"></div>` : ''}
            </div>
        `;
    }
}
