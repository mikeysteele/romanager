import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';
import './ui-toast.ts';
import { ToastType } from './ui-toast.ts';

interface ToastItem {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

@customElement('ui-toast-container')
export class UiToastContainer extends LitElement {
    @state() private toasts: ToastItem[] = [];

    static override styles = css`
        :host {
            position: fixed;
            bottom: var(--spacing-xl);
            right: var(--spacing-xl);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            pointer-events: none;
        }
    `;

    override connectedCallback() {
        super.connectedCallback();
        const target = typeof window !== 'undefined' ? window : globalThis;
        target.addEventListener('ui-toast-notify', this.handleNotify as EventListener);
    }

    override disconnectedCallback() {
        super.disconnectedCallback();
        const target = typeof window !== 'undefined' ? window : globalThis;
        target.removeEventListener('ui-toast-notify', this.handleNotify as EventListener);
    }

    private generateId(): string {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        return 'toast-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
    }

    private handleNotify = (e: CustomEvent) => {
        const { message, type = 'info', duration } = e.detail;
        const toast: ToastItem = {
            id: this.generateId(),
            message,
            type,
            duration
        };
        this.toasts = [...this.toasts, toast];
    };

    private removeToast(id: string) {
        this.toasts = this.toasts.filter(t => t.id !== id);
    }

    override render() {
        return html`
            ${map(this.toasts, (toast) => html`
                <ui-toast 
                    .message=${toast.message} 
                    .type=${toast.type} 
                    .duration=${toast.duration ?? 5000}
                    @close=${() => this.removeToast(toast.id)}>
                </ui-toast>
            `)}
        `;
    }
}

// Helper function to trigger toasts from anywhere
export const toast = (message: string, type: ToastType = 'info', duration?: number) => {
    const target = typeof window !== 'undefined' ? window : globalThis;
    const targetObj = target as unknown as { CustomEvent?: typeof CustomEvent; dispatchEvent?: (e: Event) => boolean };
    const EventCtor = targetObj.CustomEvent || CustomEvent;
    if (typeof targetObj.dispatchEvent === 'function') {
        targetObj.dispatchEvent(new EventCtor('ui-toast-notify', {
            detail: { message, type, duration }
        }));
    }
};

type ToastFn = typeof toast;


declare global {
    var toast: ToastFn;
}

// Make it globally available on window for ease of use in non-lit environments if needed
if (typeof window !== 'undefined') {
    (window as unknown as { toast?: ToastFn }).toast = toast;
}
globalThis.toast = toast;
