import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

@customElement('ui-page-header')
export class UiPageHeader extends LitElement {
    static override styles = css`
        :host {
            display: block;
            margin-bottom: var(--spacing-xl, 24px);
        }

        /* Breadcrumbs */
        .breadcrumb-nav {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.85rem;
            color: var(--color-text-tertiary, #777);
            margin-bottom: var(--spacing-sm, 8px);
        }

        .breadcrumb-link {
            color: var(--color-text-secondary, #aaa);
            text-decoration: none;
            transition: color 0.15s ease;
        }

        .breadcrumb-link:hover {
            color: var(--color-accent-primary, #f5c518);
        }

        .breadcrumb-separator {
            opacity: 0.5;
            user-select: none;
        }

        .breadcrumb-current {
            color: var(--color-text-tertiary, #888);
        }

        /* Header Row */
        .header-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: var(--spacing-md, 16px);
            flex-wrap: wrap;
        }

        .title-group {
            flex: 1;
            min-width: 250px;
        }

        .page-title {
            font-size: var(--font-size-2xl, 1.75rem);
            font-weight: 700;
            color: var(--color-text-primary, #fff);
            margin: 0 0 6px 0;
            letter-spacing: -0.01em;
            line-height: 1.2;
        }

        .page-subtitle {
            color: var(--color-text-secondary, #999);
            font-size: 0.95rem;
            margin: 0;
            line-height: 1.5;
        }

        .actions-group {
            display: flex;
            align-items: center;
            gap: var(--spacing-sm, 10px);
            flex-wrap: wrap;
        }

        ::slotted([slot="actions"]) {
            display: flex;
            align-items: center;
            gap: var(--spacing-sm, 10px);
            flex-wrap: wrap;
        }
    `;

    @property({ type: String })
    heading: string = '';

    @property({ type: String })
    subtitle: string = '';

    @property({ type: Array })
    breadcrumbs: BreadcrumbItem[] = [];

    override render() {
        return html`
            <div>
                ${this.breadcrumbs && this.breadcrumbs.length > 0 ? html`
                    <nav class="breadcrumb-nav" aria-label="Breadcrumb">
                        ${this.breadcrumbs.map((crumb, idx) => {
                            const isLast = idx === this.breadcrumbs.length - 1;
                            return html`
                                ${crumb.href && !isLast ? html`
                                    <a href=${crumb.href} class="breadcrumb-link">${crumb.label}</a>
                                ` : html`
                                    <span class="breadcrumb-current">${crumb.label}</span>
                                `}
                                ${!isLast ? html`<span class="breadcrumb-separator">/</span>` : ''}
                            `;
                        })}
                    </nav>
                ` : ''}

                <div class="header-row">
                    <div class="title-group">
                        ${this.heading ? html`<h1 class="page-title">${this.heading}</h1>` : ''}
                        <slot name="title"></slot>
                        ${this.subtitle ? html`<p class="page-subtitle">${this.subtitle}</p>` : ''}
                        <slot name="subtitle"></slot>
                    </div>

                    <div class="actions-group">
                        <slot name="actions"></slot>
                    </div>
                </div>
            </div>
        `;
    }
}
