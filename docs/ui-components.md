# UI Components & Design System

The Romanager user interface is built with [Lit](https://lit.dev/) (Web Components) and styled using [Open Props](https://open-props.style/) CSS variables.

---

## 1. Application Layout & Routing

The root component `<app-root>` (`apps/ui/src/components/app-root/app-root.ts`) sets up the main application shell:

```
+--------------------------------------------------------------------+
|  <app-header> - Brand, search bar, and action shortcuts             |
+-------------------+------------------------------------------------+
|  <app-sidebar>    |  <article> (Router Outlet)                     |
|                   |                                                |
|  - Games          |  Displays the active route component           |
|    - Library      |                                                |
|    - Add New      |                                                |
|    - Unmapped     |                                                |
|  - Settings       |                                                |
|    - ROMs         |                                                |
|    - Platforms    |                                                |
+-------------------+------------------------------------------------+
|  <ui-toast-container> - Global toast notification anchor           |
+--------------------------------------------------------------------+
```

### Route Definitions (`@lit-labs/router`)

| Route Path | Rendered Component | Purpose |
| :--- | :--- | :--- |
| `/` | `<app-library>` | Grid of all cataloged games with title filtering |
| `/add` | `<app-add-game>` | Search RAWG database and add new games to the library |
| `/game/:gameSlug` | `<app-game-detail>` | Hero backdrop, game info, and mapped ROMs table |
| `/unmapped` | `<app-unmapped>` | Staging console for newly scanned and unmapped files |
| `/settings` | `<app-settings>` | Settings dashboard overview cards |
| `/settings/rom-management` | `<app-settings-roms>` | Configure ROMs directory and initiate manual scan |
| `/settings/platforms` | `<app-settings-platforms>` | Administer emulation platforms and map BIOS/firmware files |
| `/settings/file-types` | `<app-settings-file-types>` | Configure whitelisted ROM/BIOS extensions and magic numbers |
| `/play/:gameId` | `<app-emulator>` | In-browser player shell |

---

## 2. Feature Components (`apps/ui/src/components/`)

### `<app-library>`
- Displays all games in a responsive CSS grid (`app-game-list`).
- Real-time client search filter.
- Listens to `window` `roms-updated` custom events to re-fetch catalog data when background imports or deletions finish.

### `<app-game-detail>`
- Reads route parameter `gameSlug`.
- Renders hero background artwork using CSS mask gradient fade.
- Displays metadata badges (rating, release year).
- Provides platform tabs showing mapped ROM files, sizes, regions, and hashes.
- Delete modal allows deleting game from catalog, optionally triggering disk file removal.

### `<app-unmapped>`
- Displays all newly discovered files waiting in the `scanned_files` table.
- Interactive `<data-table>` with sorting and column formatting.
- Supports single file review/import, single file ignore, and bulk ignore.

### `<app-import>`
- Modal dialog for assigning a scanned file to a Game and Platform.
- Auto-extracts clean game titles by stripping extensions and bracketed tags.
- Tabbed search between online RAWG database and existing local library.
- Auto-filters system list to systems matching the chosen game.

### `<app-settings-platforms>`
- System card list with slug badges and associated BIOS/firmware files.
- Add System dialog for defining custom platforms.
- Map File dialog to link an unmapped file directly to a system's firmware list.

### `<app-settings-file-types>`
- Whitelist rule management for scanner file filtering.
- Visual display of extension badges, optional magic numbers, and descriptions.
- Add File Type dialog to specify new extensions and magic number hex signatures.
- Delete action to remove file extensions from active scanner consideration.


---

## 3. Shared Component Library (`@repo/ui-components`)

Located in [`packages/ui-components/src`](../packages/ui-components/src), these reusable Web Components are shared across the application:

### `<data-table>`
A customizable data table with sorting, custom cell renderers, and multi-row selection:
- **Attributes / Properties**:
  - `columns`: Array of column configurations (`header`, `key`, `sortable`, `render()`).
  - `data`: Array of data objects.
  - `selectable`: Boolean enabling row checkboxes.
- **Events**:
  - `@selection-change`: Dispatches selected IDs.

### `<game-card>`
Visual game poster card:
- **Attributes / Properties**:
  - `game`: Game object (`name`, `backgroundImage`, `released`, `rating`).
- **Features**: Aspect ratio locking, hover elevation, missing artwork fallback placeholder.

### `<ui-button>`
Styled button element:
- **Attributes**:
  - `variant`: `"primary"` (Radarr yellow/accent), `"secondary"`, or `"error"` (danger red).
  - `size`: `"sm"` or standard.
  - `href`: When set, behaves visually as a button while rendering a navigation link.
  - `disabled`: Disables interaction.

### `<ui-dialog>`
Modal dialog with animated backdrop overlay:
- **Attributes**:
  - `open`: Boolean controlling visibility.
  - `heading`: Dialog title.
- **Slots**:
  - Default slot: Modal body content.
  - `header`: Custom header content.
  - `actions` / `footer`: Modal action buttons.
- **Events**:
  - `@ui-dialog-close`: Fired when closed or overlay is clicked.

### `<ui-tabs>` & `<ui-tab-panel>`
Accessible tab navigation bar and tab panels:
- Tabs auto-populate navigation items based on child `<ui-tab-panel>` elements.
- **Events**:
  - `@tab-changed`: Emits active tab name.

### `<ui-toast-container>` & `toast()`
Toast alert notification service:
- Global container fixed to the viewport.
- Imperative API: `toast(message, 'success' | 'error' | 'info')`.

### `<ui-folder-browser>`
Interactive filesystem folder selection modal:
- **Attributes / Properties**:
  - `open`: Boolean controlling dialog visibility.
  - `initialPath`: Starting directory path.
- **Features**:
  - Breadcrumb / text input bar with "Up" navigation.
  - Quick-jump shortcut chips (`/`, `Home`, `/mnt`, `/media`, `Project`).
  - Instant directory filter search input.
  - Single-click selection and double-click / Open folder navigation.
- **Events**:
  - `@folder-selected`: Emits `{ path: string }` on confirmation.
  - `@ui-folder-browser-close`: Fired when closed or cancelled.

### `<ui-page-header>`
Standardized page header and breadcrumb navigation bar:
- **Attributes / Properties**:
  - `heading`: Main title of the view.
  - `subtitle`: Explanatory text beneath the heading.
  - `breadcrumbs`: Array of `{ label: string, href?: string }` objects rendering clickable breadcrumb hierarchy.
- **Slots**:
  - `actions`: Slot positioned in the top-right of the header row for action buttons (`<ui-button>`).
  - `title` / `subtitle`: Optional custom header replacement content.

---

## 4. Design System & Styling Tokens

Styling tokens are defined in [`apps/ui/src/global/app.css`](../apps/ui/src/global/app.css) mapped to [Open Props](https://open-props.style/):

```css
:root {
  /* Brand Palette */
  --color-bg-primary: #0f0f15;
  --color-bg-secondary: var(--stone-11);
  --color-bg-tertiary: var(--stone-10);
  --color-bg-glass: rgba(24, 24, 27, 0.7);

  /* Typography */
  --color-text-primary: var(--stone-0);
  --color-text-secondary: var(--stone-3);
  --color-text-tertiary: var(--stone-5);

  /* Accent & Status */
  --color-accent-primary: var(--violet-6);
  --accent-color: #f5c518; /* Radarr Yellow */
  --color-success: var(--emerald-6);
  --color-warning: var(--amber-6);
  --color-error: var(--red-6);

  /* Spacing Scale */
  --spacing-xs: var(--size-1);  /* 4px */
  --spacing-sm: var(--size-2);  /* 8px */
  --spacing-md: var(--size-4);  /* 16px */
  --spacing-lg: var(--size-6);  /* 24px */
  --spacing-xl: var(--size-7);  /* 32px */
  --spacing-2xl: var(--size-8); /* 40px */
}
```
