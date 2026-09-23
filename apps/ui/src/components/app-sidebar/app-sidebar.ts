import { LitElement, html, css, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';

interface NavItem {
    id: string; // Unique ID for state tracking
    title: string;
    href?: string;
    children?: NavItem[];
    expanded?: boolean; // Initial state
}

@customElement('app-sidebar')
export class AppSidebar extends LitElement {
  @property() currentPath: string = '/';
  
  // Internal state to track expanded items by ID
  @state() expandedItems = new Set<string>(['games']);

  // Define the menu structure
  private navItems: NavItem[] = [
    {
        id: 'games',
        title: 'Games',
        href: '/',
        expanded: true,
        children: [
            { id: 'add-new', title: 'Add New', href: '/add' },
            { id: 'unmapped', title: 'Unmapped', href: '/unmapped' },
            { id: 'collections', title: 'Collections', href: '#' },
            { id: 'discover', title: 'Discover', href: '#' },
        ]
    },
            { id: 'activity', title: 'Activity', href: '#' },
            { id: 'logs', title: 'Logs', href: '#' },
    {
        id: 'settings',
        title: 'Settings',
        href: '/settings',
        expanded: location.pathname.startsWith('/settings'),
        children: [
            { id: 'settings-roms', title: 'ROM Management', href: '/settings/rom-management' },
            { id: 'settings-platforms', title: 'Platforms', href: '/settings/platforms' },
            { id: 'settings-file-types', title: 'File Types', href: '/settings/file-types' }
        ]
    }

  ];

  static override styles = css`
    :host {
      display: block;
      height: 100%;
      overflow: hidden;
      --sidebar-bg: #1e1e24;
      --sidebar-bg-accent: #27272e;
      --sidebar-text: #ccc;
      --sidebar-text-hover: #fff;
      --accent-color: var(--color-accent-primary, #f5c518);
    }

    aside {
      height: 100%;
      background-color: var(--sidebar-bg);
      display: flex;
      flex-direction: column;
      border-right: 1px solid rgba(255, 255, 255, 0.05);
      overflow-y: auto;
    }

    .nav-list {
      display: flex;
      flex-direction: column;
    }

    .nav-item {
        display: flex;
        flex-direction: column;
    }

    .nav-link {
      display: flex;
      align-items: center;
      padding: var(--spacing-sm, 8px) var(--spacing-lg, 16px);
      color: var(--sidebar-text);
      text-decoration: none;
      font-size: 0.95rem;
      border-left: 3px solid transparent;
      transition: all 0.1s ease-in-out;
      cursor: pointer;
      user-select: none;
    }

    .nav-link:hover {
      background-color: var(--sidebar-bg-accent);
      color: var(--sidebar-text-hover);
    }

    .nav-link.active {
      border-left-color: var(--accent-color);
      background-color: var(--sidebar-bg-accent);
      color: var(--sidebar-text-hover);
    }
    
    .nav-link.parent {
        font-weight: 600;
        text-transform: uppercase;
        font-size: 0.85rem;
        letter-spacing: 0.05em;
        color: var(--accent-color);

    }
    
    .nav-link.parent:hover {
        background: transparent;
        color: var(--accent-color);
    }

    /* Indentation for children */
    .children {
        display: flex;
        flex-direction: column;
    }
    
    /* Toggle Icon */
    .toggle {
        margin-right: 8px;
        font-size: 0.7em;
        transition: transform 0.2s;
        display: inline-block;
        width: 1em;
        text-align: center;
    }
    
    .toggle.expanded {
        transform: rotate(90deg);
    }
    
    /* Child link styling specific */
    .child-link {
        padding-left: calc(var(--spacing-lg, 16px) + 12px);
    }
    .parent-link {
        color: inherit;
        text-decoration: none;
        flex: 1;
    }
    
    .parent-link:hover {
        text-decoration: none;
    }
  `;

  toggle(id: string, groupIds: string[]) {
      const newSet = new Set(this.expandedItems);
      
      if (newSet.has(id)) {
          newSet.delete(id);
      } else {
          // Accordion: Close other items in the same group
          groupIds.forEach(groupId => {
             if (groupId !== id) newSet.delete(groupId);
          });
          newSet.add(id);
      }
      this.expandedItems = newSet;
  }

  isExpanded(id: string): boolean {
      return this.expandedItems.has(id);
  }

  isActive(href?: string): boolean {
      if (!href || href === '#') return false;
      if (href === '/') return this.currentPath === '/';
      return this.currentPath.startsWith(href);
  }

  renderNavItem(item: NavItem, siblings: NavItem[], level: number = 0): TemplateResult {
      const hasChildren = item.children && item.children.length > 0;
      const expanded = this.isExpanded(item.id);
      const active = this.isActive(item.href);
      
      // Get IDs of all siblings that are parents (candidates for toggling)
      const siblingIds = siblings
        .filter(sib => sib.children && sib.children.length > 0)
        .map(sib => sib.id);

      const handleToggle = () => {
          this.toggle(item.id, siblingIds);
      };

      return html`
        <div class="nav-item">
            ${hasChildren ? html`
                <div class="nav-link parent ${active ? 'active' : ''}" @click=${handleToggle}>
                    <span class="toggle ${expanded ? 'expanded' : ''}" >▶</span>
                    ${item.href ? html`
                        <a href="${item.href}" class="parent-link">${item.title}</a>
                    ` : html`
                        <span style="flex:1; cursor: pointer;">${item.title}</span>
                    `}
                </div>
                ${expanded ? html`
                    <div class="children">
                        ${map(item.children!, (child) => this.renderNavItem(child, item.children!, level + 1))}
                    </div>
                ` : ''}
            ` : html`
                <a href="${item.href || '#'}" class="nav-link ${active ? 'active' : ''} ${level > 0 ? 'child-link' : ''}">
                    ${item.title}
                </a>
            `}
        </div>
      `;
  }

  override render() {
    return html`
    <aside>
      <div class="nav-list">
        ${map(this.navItems, (item) => this.renderNavItem(item, this.navItems))}
      </div>
    </aside>
    `;
  }
}
