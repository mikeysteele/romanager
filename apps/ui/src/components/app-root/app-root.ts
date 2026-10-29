import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { Router } from '@lit-labs/router';
import { toast } from '@repo/ui-components';

// Import components to ensure they are registered
import '../app-library/app-library.ts';
import '../app-settings/app-settings.ts';
import '../app-settings-roms/app-settings-roms.ts';
import '../app-settings-platforms/app-settings-platforms.ts';
import '../app-settings-file-types/app-settings-file-types.ts';
import '../app-settings-devices/app-settings-devices.ts';
import '../app-game-detail/app-game-detail.ts';
import '../app-emulator/app-emulator.ts';
import '../app-unmapped/app-unmapped.ts';
import '../app-add-game/app-add-game.ts';
import '../app-header/app-header.ts';
import '../app-sidebar/app-sidebar.ts';
import '../app-system-detail/app-system-detail.ts';

@customElement('app-root')
export class AppRoot extends LitElement {
  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100%;
      --sidebar-width: 240px;
      --sidebar-bg: #1e1e24; /* Dark charcoal */
      --sidebar-bg-accent: #27272e;
      --sidebar-text: #ccc;
      --sidebar-text-hover: #fff;
      --accent-color: #f5c518; /* Radarr Yellow */
      --content-bg: var(--color-bg-primary); 
    }

    header {
       height: 64px;
       background: var(--color-bg-glass);
       backdrop-filter: blur(10px);
       border-bottom: 1px solid var(--border-color);
       display: flex;
       align-items: center;
       flex-direction: row;
       justify-content: space-between;
       padding: 0 var(--spacing-xl);
       flex-shrink: 0;
    }

    .search-bar {
        display: flex;
        align-items: center;
        background: rgba(255,255,255,0.05);
        border-radius: var(--border-radius-md);
        padding: 8px 16px;
        width: 300px;
        color: var(--color-text-secondary);
    }

    main {
      flex: 1;
      display: grid;
      grid-template-areas: "sidebar main";
      grid-template-columns: var(--sidebar-width) auto;
    }


    /* Main Content */
    article {
      background-color: var(--content-bg);
      grid-area: main;
                  padding: var(--spacing-xl);

    }

    
 
  `;

  private _routes = new Router(this, [
    { 
        path: '/', 
        render: () => html`<app-library></app-library> `
    },
    { 
        path: '/add', 
        render: () => html`<app-add-game></app-add-game> `
    },
    { 
        path: '/settings', 
        render: () => html`<app-settings></app-settings> `
    },
    { 
        path: '/settings/rom-management', 
        render: () => html`<app-settings-roms></app-settings-roms> `
    },
    { 
        path: '/settings/platforms', 
        render: () => html`<app-settings-platforms></app-settings-platforms> `
    },
    { 
        path: '/settings/file-types', 
        render: () => html`<app-settings-file-types></app-settings-file-types> `
    },
    { 
        path: '/settings/devices', 
        render: () => html`<app-settings-devices></app-settings-devices> `
    },
    { 
        path: '/unmapped', 
        render: () => html`<app-unmapped></app-unmapped> `
    },
    { 
        path: '/platform/:platformSlug', 
        render: ({ platformSlug }) => html`<app-system-detail platformSlug="${platformSlug}"></app-system-detail> `
    },
    { 
        path: '/system/:systemSlug', 
        render: ({ systemSlug }) => html`<app-system-detail platformSlug="${systemSlug}"></app-system-detail> `
    },
    { 
        path: '/game/:gameSlug', 
        render: ({  gameSlug }) => html`<app-game-detail  gameSlug="${gameSlug}"></app-game-detail> `
    },
    { 
        path: '/play/:gameId', 
        render: ({ gameId }) => html`<app-emulator gameId="${gameId}"></app-emulator> `
    },
    { 
        path: '**', 
        render: () => html`<app-library></app-library> `
    }
  ]);

  private eventSource: EventSource | null = null;
  private sseRetryTimer: ReturnType<typeof setTimeout> | null = null;

  override connectedCallback() {
      super.connectedCallback();
      this.connectSSE();
  }

  override disconnectedCallback() {
      super.disconnectedCallback();
      if (this.eventSource && typeof this.eventSource.close === 'function') {
          this.eventSource.close();
      }
      this.eventSource = null;
      if (this.sseRetryTimer) {
          clearTimeout(this.sseRetryTimer);
          this.sseRetryTimer = null;
      }
  }

  connectSSE() {
    if (this.eventSource && typeof this.eventSource.close === 'function') {
      this.eventSource.close();
    }
    this.eventSource = null;

    try {
      if (typeof EventSource === 'undefined') return;
      const eventSource = new EventSource('/api/events');
      this.eventSource = eventSource;

      const handleMessageData = (raw: string) => {
        try {
          const data = JSON.parse(raw);
          if (data.type === 'start') {
            toast('Scanning library in background...', 'info', 3000);
            globalThis.dispatchEvent(new CustomEvent('scan-started'));
          } else if (data.type === 'progress') {
            globalThis.dispatchEvent(new CustomEvent('scan-progress', { detail: data }));
          } else if (data.type === 'done') {
            if (
              data.action === 'rom-deleted' ||
              data.action === 'game-deleted' ||
              data.action === 'roms-updated'
            ) {
              globalThis.dispatchEvent(new CustomEvent('roms-updated'));
            } else if (
              data.action === 'system-deleted' || 
              data.action === 'system-created' || 
              data.action === 'platform-deleted' || 
              data.action === 'platform-created' ||
              data.action === 'platforms-updated' ||
              data.action === 'systems-updated' ||
              data.action === 'game-added'
            ) {
              globalThis.dispatchEvent(new CustomEvent('platforms-updated'));
              globalThis.dispatchEvent(new CustomEvent('systems-updated'));
              globalThis.dispatchEvent(new CustomEvent('roms-updated'));
            } else if (!data.action || data.action === 'scan-complete') {
              const count = typeof data.count === 'number' ? data.count : 0;
              const msg = count > 0 
                ? `Scan complete! Discovered ${count} new file(s).` 
                : 'Scan complete! Library is up to date.';
              toast(msg, 'success', 5000);
              globalThis.dispatchEvent(new CustomEvent('scan-done', { detail: { count } }));
              globalThis.dispatchEvent(new CustomEvent('roms-updated'));
            }
          } else if (data.type === 'error') {
            toast(`Scan failed: ${data.message || 'Unknown error'}`, 'error', 6000);
            globalThis.dispatchEvent(new CustomEvent('scan-error', { detail: data }));
          }
        } catch (e) {
          console.error('Error parsing SSE event', e);
        }
      };

      eventSource.onmessage = (event) => handleMessageData(event.data);
      if (typeof eventSource.addEventListener === 'function') {
        eventSource.addEventListener('update', (event: Event) => handleMessageData((event as MessageEvent).data));
      }

      eventSource.onerror = () => {
        if (typeof eventSource.close === 'function') {
          eventSource.close();
        }
        if (!this.sseRetryTimer) {
          this.sseRetryTimer = setTimeout(() => {
            this.sseRetryTimer = null;
            this.connectSSE();
          }, 4000);
        }
      };
    } catch (e) {
      console.error('Failed to initialize EventSource:', e);
    }
  }

  override render() {

    return html`
      <ui-toast-container></ui-toast-container>
      <app-header></app-header>
      <main>
         <app-sidebar .currentPath=${location.pathname}></app-sidebar>
         <article>
              ${this._routes.outlet()}
         </article>
      </main>
    `;
  }
}
