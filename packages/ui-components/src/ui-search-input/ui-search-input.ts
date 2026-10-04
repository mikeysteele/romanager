import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { when } from 'lit/directives/when.js';

@customElement('ui-search-input')
export class UiSearchInput extends LitElement {
    static override styles = css`
        :host {
            display: block;
            width: 100%;
        }
        .search-wrapper {
            position: relative;
            display: flex;
            align-items: center;
        }
        input[type="search"] {
            width: 100%;
            padding: var(--spacing-md);
            padding-left: 40px; /* space for icon */
            background: var(--color-bg-tertiary);
            border: 1px solid var(--border-color);
            border-radius: var(--border-radius-sm);
            color: var(--color-text-primary);
            font-size: var(--font-size-lg);
            box-sizing: border-box;
        }
        input[type="search"]:focus {
            outline: none;
            border-color: var(--color-accent-primary);
        }
        .icon {
            position: absolute;
            left: 12px;
            color: var(--color-text-secondary);
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
        }
        svg {
            width: 20px;
            height: 20px;
        }
        .spinner {
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            100% {
                transform: rotate(360deg);
            }
        }
    `;

    @property({ type: String }) value = '';
    @property({ type: String }) placeholder = 'Search...';
    @property({ type: Boolean }) loading = false;
    @property({ type: Number }) debounceMs = 500;

    private debounceTimer?: ReturnType<typeof setTimeout>;

    private handleInput(e: Event) {
        const target = e.target as HTMLInputElement;
        this.value = target.value;
        
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = globalThis.setTimeout(() => {
            this.dispatchEvent(new CustomEvent('search', {
                detail: { value: this.value },
                bubbles: true,
                composed: true
            }));
        }, this.debounceMs);
    }

    override render() {
        return html`
            <div class="search-wrapper">
                <div class="icon">
                    ${when(this.loading,
                        () => html`
                            <svg class="spinner" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                            </svg>
                        `,
                        () => html`
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                        `
                    )}
                </div>
                <input 
                    type="search" 
                    .value=${this.value}
                    placeholder=${this.placeholder}
                    @input=${this.handleInput}
                >
            </div>
        `;
    }
}
