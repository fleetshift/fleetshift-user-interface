# Module Groups — Nested Navigation and Hierarchical Search

**Epic:** [OME-3 — Addon / Extension Model](https://redhat.atlassian.net/browse/OME-3)
**Depends on:** [Feature Contracts](./feature-contracts.md)
**Status:** Draft

## Context

FleetShift navigation is flat — each `fleetshift.module` gets a top-level `NavItem` in the sidebar and a route at `/{pluginKey}/{moduleId}`. As the number of plugins grows, the nav becomes an undifferentiated list. Plugins like `settings-plugin` already declare multiple modules (Navigation, Authentication, Extensions) that logically belong together but render as three separate nav items.

We need **expandable nav groups** — a bucket of related modules that collapses and expands in the sidebar, with nested routes under a shared URL prefix. This also impacts search (hierarchical result grouping) and breadcrumbs.

## Design Principles

1. **Plugin-scoped groups.** A plugin defines its own groups and assigns its own modules to them. No cross-plugin page injection — community plugins cannot add pages to another plugin's group. Extensions (tabs, panels, providers) remain the cross-plugin mechanism.
2. **Grouping is navigational.** Groups organize the sidebar and URL namespace. They don't change the module's identity or capabilities.
3. **Backward-compatible.** Modules without a `group` stay top-level. Existing plugins work unchanged.
4. **User reorder (existing).** Users can already reorder nav items via Settings. This must work with groups — reorder groups at the top level and modules within groups. Search and breadcrumbs follow the active (user-customized) layout. Creating custom groups or moving modules across plugin boundaries is a future extension.

## New Extension Type: `fleetshift.module-group`

A module group declares a navigational container for related modules within the same plugin.

```typescript
type ModuleGroupExtras = {
  /** Icon rendered in the nav group header */
  icon: EncodedCodeRef;
};
```

Added to the extension type registry:

```typescript
const FLEETSHIFT_EXTENSION_TYPES = [
  "fleetshift.module-group",   // new
  "fleetshift.module",
  "fleetshift.setup",
  "fleetshift.cluster-provider",
  "fleetshift.onboarding-action",
] as const;
```

### Builder

```typescript
function createModuleGroup(
  props: BaseExtensionProperties & ModuleGroupExtras
): FleetshiftExtension<"fleetshift.module-group", ModuleGroupExtras>;
```

### Manifest output

```json
{
  "type": "fleetshift.module-group",
  "properties": {
    "id": "settings",
    "label": "Settings",
    "description": "Workspace settings and configuration",
    "keywords": ["settings", "preferences", "configuration"],
    "icon": { "$codeRef": "SettingsIcon.default" }
  }
}
```

## Updated `fleetshift.module`

Modules gain an optional `group` field referencing a `fleetshift.module-group` id **within the same plugin**.

```typescript
type ModuleExtras = {
  component: EncodedCodeRef;
  icon: EncodedCodeRef;
  extensionPoints?: Record<string, ExtensionPointDeclaration>;
  /** References a fleetshift.module-group id in the same plugin. */
  group?: string;
};
```

When `group` is set:
- The module's icon is still **required**. It may not display in the nav (the group icon represents the collapsed section), but search results and breadcrumbs use the individual module icon.
- The module's route nests under the group: `/{groupId}/{moduleId}`.

When `group` is omitted:
- Behavior is unchanged — top-level nav item, route at `/{pluginKey}/{moduleId}`.

## URL Structure

Groups own the top-level URL segment. Modules within a group nest under it.

| Scenario | Route |
|----------|-------|
| Ungrouped module (current behavior) | `/{pluginKey}/{moduleId}` |
| Group URL (redirect to first child) | `/{groupId}` → `/{groupId}/{firstChildId}` |
| Module in a group | `/{groupId}/{moduleId}` |

Groups do not have their own route or component. Navigating to `/{groupId}` redirects to the first child module. If a group needs a "homepage", make it an explicit first child module (e.g., `createModule({ id: "overview", group: "settings", ... })`).

The `{groupId}` replaces `{pluginKey}` as the URL namespace for grouped modules. Module ids must be unique within their group. Across groups, the same module id can appear (e.g., both `/compute/settings` and `/networking/settings`).

**Ungrouped modules** keep the current `/{pluginKey}/{moduleId}` pattern for backward compatibility.

**Route registration order:** Routes must be registered longest-path-first to prevent a shorter prefix from shadowing a longer path (e.g., `/settings` must not match before `/settings/navigation`).

### Example

```
/settings/navigation          ← settings-plugin, group "settings"
/settings/auth                ← settings-plugin, group "settings"
/settings/extensions           ← settings-plugin, group "settings"
/core/clusters                 ← core-plugin, ungrouped (no change)
/overview/overview             ← overview-plugin, ungrouped (no change)
```

## Plugin Config Example

Before (current — `settings-plugin`):

```typescript
const SettingsPlugin = new FleetshiftPlugin({
  extensions: [
    createModule({
      id: "settings",
      label: "Navigation",
      component: { $codeRef: "SettingsPage.default" },
      icon: { $codeRef: "SettingsIcon.default" },
      // ...
    }),
    createModule({
      id: "auth-settings",
      label: "Authentication",
      component: { $codeRef: "AuthSettingsPage.default" },
      icon: { $codeRef: "AuthIcon.default" },
      // ...
    }),
    createModule({
      id: "extensions",
      label: "Extensions",
      component: { $codeRef: "ExtensionsPage.default" },
      icon: { $codeRef: "ExtensionsIcon.default" },
      // ...
    }),
  ],
  // ...
});
```

Routes: `/settings/settings`, `/settings/auth-settings`, `/settings/extensions`

After:

```typescript
const SettingsPlugin = new FleetshiftPlugin({
  extensions: [
    createModuleGroup({
      id: "settings",
      label: "Settings",
      icon: { $codeRef: "SettingsIcon.default" },
      description: "Workspace settings and configuration",
      keywords: ["settings", "preferences"],
    }),
    createModule({
      id: "navigation",
      label: "Navigation",
      group: "settings",
      component: { $codeRef: "SettingsPage.default" },
      icon: { $codeRef: "NavIcon.default" },
      description: "Manage nav layout and workspace preferences",
      keywords: ["nav", "order"],
    }),
    createModule({
      id: "auth",
      label: "Authentication",
      group: "settings",
      component: { $codeRef: "AuthSettingsPage.default" },
      icon: { $codeRef: "AuthIcon.default" },
      description: "Configure authentication provider and OIDC settings",
      keywords: ["auth", "oidc", "keycloak"],
    }),
    createModule({
      id: "extensions",
      label: "Extensions",
      group: "settings",
      component: { $codeRef: "ExtensionsPage.default" },
      icon: { $codeRef: "ExtensionsIcon.default" },
      description: "Discover and configure extensions",
      keywords: ["extension", "addon"],
    }),
  ],
  // MF config unchanged
});
```

Routes: `/settings/navigation`, `/settings/auth`, `/settings/extensions`

## Build-Time Validation

`FleetshiftPlugin` validates at build time:

1. **Group exists.** If a module declares `group: "foo"`, a `fleetshift.module-group` with `id: "foo"` must exist in the same plugin's `extensions` array. Build fails otherwise.
2. **No cross-plugin groups.** Groups are scoped to the plugin. There is no mechanism to reference a group from another plugin.
3. **Unique ids within group.** Two modules in the same group cannot share an id.
4. **Group id format.** Must match `/^[a-z][a-z0-9-]*$/` (same as module ids) since it becomes a URL segment.

## Backend: `navLayout` Changes

### Current format (flat)

```json
{
  "navLayout": [
    { "type": "page", "pageId": "overview.overview" },
    { "type": "page", "pageId": "core.clusters" },
    { "type": "page", "pageId": "settings.settings" },
    { "type": "page", "pageId": "settings.auth-settings" },
    { "type": "page", "pageId": "settings.extensions" }
  ]
}
```

### New format (nested)

```json
{
  "navLayout": [
    { "type": "page", "pageId": "overview.overview" },
    { "type": "page", "pageId": "core.clusters" },
    {
      "type": "group",
      "groupId": "settings",
      "pluginKey": "settings-plugin",
      "label": "Settings",
      "icon": "SettingsIcon",
      "children": [
        { "type": "page", "pageId": "settings.navigation" },
        { "type": "page", "pageId": "settings.auth" },
        { "type": "page", "pageId": "settings.extensions" }
      ]
    }
  ]
}
```

The backend's `generateNavLayout()` function scans manifests for `fleetshift.module-group` extensions, collects modules with matching `group` fields, and nests them under the group entry. Ungrouped modules remain as top-level `"type": "page"` entries.

`pluginPages` is unchanged — it still lists every module as a flat page entry (id, title, path, scope, module, pluginKey). The grouping is a nav concern, not a routing concern. The shell's router registers all pages flat; the nav component renders the hierarchy from `navLayout`.

## Shell: Navigation Rendering

### Current (`AppNav`)

Renders a flat list of `NavItem` components from `navLayout`.

### After

Uses PF `NavExpandable` for groups:

```
▾ Settings              ← NavExpandable (group header, no link)
    Navigation           ← NavItem (link to /settings/navigation)
    Authentication       ← NavItem (link to /settings/auth)
    Extensions           ← NavItem (link to /settings/extensions)
  Overview               ← NavItem (top-level, link to /overview/overview)
  Clusters               ← NavItem (top-level, link to /core/clusters)
```

PF `NavExpandable` renders a `<button>`, not a link. The group header expands/collapses the section. It is not navigable — clicking it does not navigate anywhere.

### Active state

A group is visually expanded when any of its child modules is the active route. This uses the same route matching mechanism as current `NavItem` active detection — `location.pathname === fullPath || location.pathname.startsWith(fullPath + "/")`. PF `NavExpandable` accepts `isExpanded` which is set to `true` when any child route matches.

## Search

### Current hierarchy

```
category: "nav"       → module (page)
category: "extension" → cluster-provider, onboarding-action, etc.
feature: "core.clusters" → groups extensions under parent module
```

### New hierarchy

```
group → module → extension
```

Search entries gain a `group` field:

```typescript
interface SearchEntry {
  id: string;
  category: "nav" | "nav-group" | "extension";
  group?: string;        // module-group id (e.g., "settings")
  feature: string;       // module feature id (e.g., "settings.navigation")
  title: string;
  description: string;
  keywords: string[];
  route: string;
  icon?: ComponentType;
  searchResult?: ComponentType<SearchResultProps>;
}
```

### Indexing rules

| Extension type | `category` | `group` | `feature` | `route` |
|----------------|-----------|---------|-----------|---------|
| `fleetshift.module-group` | `nav-group` | — | — | `/{groupId}` (or first child) |
| `fleetshift.module` (grouped) | `nav` | group id | `{pluginKey}.{moduleId}` | `/{groupId}/{moduleId}` |
| `fleetshift.module` (ungrouped) | `nav` | — | `{pluginKey}.{moduleId}` | `/{pluginKey}/{moduleId}` |
| Other extensions | `extension` | inherited from parent module | parent feature id | composed from parent |

### Search result rendering

Groups appear as a collapsible header in search results. Modules and extensions nest under them. Grouped modules can also have extensionPoints with extensions nesting further:

```
Settings                          ← nav-group (clickable → /settings/navigation)
  Navigation — Manage nav layout  ← nav
  Authentication — Configure OIDC ← nav
  Extensions — Discover addons    ← nav
    ├── GCP HCP — Connect GCP...  ← extension (onboarding-action under grouped module)
    └── Kind — Local cluster...   ← extension

Pages
  Clusters — View and manage...   ← nav (ungrouped, no parent group)
    ├── GCP HCP — Managed...      ← extension (cluster-provider)
    └── Kind — Local cluster...   ← extension
```

The full search hierarchy is: **group → module → extension**. Ungrouped modules skip the group level. Extensions nest under their parent module regardless of whether that module is grouped or not.

Clicking a group in search navigates to the first child module (same as URL redirect behavior).

## Breadcrumbs

With hierarchical routes, breadcrumbs follow the group → module → extension chain:

| Route | Breadcrumbs |
|-------|-------------|
| `/settings/navigation` | Settings > Navigation |
| `/settings/auth` | Settings > Authentication |
| `/core/clusters` | Clusters (ungrouped, no parent) |
| `/core/clusters?create=gcphcp` | Clusters > GCP HCP |

The shell derives breadcrumbs from `navLayout` + current route. Group label comes from the `fleetshift.module-group` metadata. Module label comes from the `fleetshift.module` metadata.

## `CORE_EXTENSION_META` and `navSection`

Currently `CORE_EXTENSION_META` maps plugin scope → `navSection: "main" | "bottom"`. With groups, this mapping applies to the **group** (or ungrouped module):

- A group in `navSection: "bottom"` renders at the bottom of the nav (e.g., Settings).
- All modules within the group inherit the section — you can't split a group across main/bottom.

The `CORE_EXTENSION_META` keys will reference group ids for grouped plugins and plugin scopes for ungrouped plugins. The exact data shape will be determined during implementation — the key property is that `navSection` applies at the group level.

## Nav Reorder (Existing — Must Adapt)

Nav reordering already exists. Users can drag-reorder nav items via the Settings > Navigation page (`NavOrderEditor`). The current implementation is flat:

- **Storage:** IndexedDB `nav-order` store holds a flat `string[]` of page IDs.
- **Ordering:** `orderByIds()` sorts items by saved order position. Unknown items sort alphabetically at the end.
- **Editor:** `NavOrderEditor` uses PF `DragDropSort` on two flat lists (main section, bottom section).
- **Consumer:** `AppNav` calls `orderByIds(mainItems, savedOrder)` and `orderByIds(bottomItems, savedOrder)`.

### What changes

The flat `string[]` cannot represent nested ordering (group order + module order within groups). Replace with a nested structure:

```typescript
type NavOrderEntry =
  | { type: "page"; pageId: string }
  | { type: "group"; groupId: string; icon?: string; label?: string; children: string[] };

// Stored as NavOrderEntry[]
```

This is a breaking change from the current flat `string[]`. We are still in POC phase — pick the most robust solution, not the backward-compatible one.

- Top-level array defines order of groups and ungrouped pages.
- Each group entry defines order of its child modules.
- `icon` and `label` on group entries support user-created custom groups (groups not backed by plugin manifests).

### IndexedDB migration

Bump `EXTENSION_DB_VERSION` from 2 to 3. On upgrade, wipe the `nav-order` store — existing flat data is not worth migrating. Users re-customize their order.

### NavOrderEditor changes

The editor needs to support:

1. **Reorder groups and ungrouped pages** at the top level (existing drag-drop pattern).
2. **Reorder modules within a group** (nested drag-drop within each expandable section).
3. **Drag a module into a group** — moving an ungrouped module into a group creates a user-defined grouping override.
4. **Create a custom group** — users can create new groups that don't come from plugin manifests. Requires a name and icon.

### Icon gallery for custom groups

Custom groups need icons. Rather than requiring users to type a PF icon name:

1. **Build-time:** Generate a JSON manifest of all available PF icon import paths (from `@patternfly/react-icons`).
2. **Runtime:** Show a gallery modal where users browse and pick an icon. Use dynamic `import()` to load only the selected icon — no star import, no massive bundle.
3. **Caching:** Store the selected icon reference in IndexedDB alongside the custom group. Load the icon JSON manifest only when the gallery is opened and IndexedDB has no cached copy.

### Search must follow active layout

Search results and breadcrumbs must reflect the user's configured nav layout, not just the plugin-defined default. This means:

- **Search grouping:** If the user reordered modules within a group or reordered groups, search results should match that order when displaying grouped results.
- **Breadcrumbs:** The group → module chain follows the active layout. If a module's group has been reordered, the breadcrumb still shows the correct group label (group labels are from plugin metadata, only order changes).
- **Search index rebuild:** The Orama index is built once on bootstrap. It needs access to the resolved nav order (plugin default + user overrides) to set correct `group` fields and result ordering. `SearchProvider` already reads `pluginPages` from `AppConfig` — it also needs to read the active nav order.

### Admin custom groups (Future)

Creating entirely new groups, moving modules across plugin boundaries, or renaming groups is a separate capability beyond reordering. Deferred to a future design. The reorder system described above handles ordering within the plugin-defined group structure.

## Migration

### Phase 1: Contract (build-utils)

1. Add `ModuleGroupExtras` type and `"fleetshift.module-group"` to `FLEETSHIFT_EXTENSION_TYPES`.
2. Add optional `group?: string` to `ModuleExtras`.
3. Add `createModuleGroup()` builder function.
4. Add build-time validation in `FleetshiftPlugin`.

### Phase 2: Backend (fleetshift-poc)

1. Update `generatePluginPages()` to handle `fleetshift.module-group` extensions and `group` properties.
2. Update `generateNavLayout()` to emit nested `{ type: "group", children: [...] }` entries.
3. Route generation: grouped modules get `/{groupId}/{moduleId}` paths.

### Phase 3: Shell (gui)

1. Update `AppNav` to render `NavExpandable` for group entries in `navLayout`.
2. Update router to handle group-prefixed routes (longest-path-first registration).
3. Add redirect for group URLs → first child.
4. Update search indexing to include `group` field and `nav-group` category.
5. Search index must respect active nav order (plugin default + user reorder).
6. Add breadcrumb component.

### Phase 4: Nav Reorder

1. Change IndexedDB `nav-order` store from flat `string[]` to nested `NavOrderEntry[]`.
2. Bump `EXTENSION_DB_VERSION` to 3, wipe old data on upgrade.
3. Update `NavOrderEditor` for nested drag-drop (top-level groups + within-group modules).
4. Support dragging modules into groups and creating custom groups.
5. Build PF icon gallery: build-time JSON manifest + runtime dynamic import + IndexedDB cache.

### Phase 5: Adopt

1. Convert `settings-plugin` to use module groups (3 modules → 1 group + 3 grouped modules).
2. Evaluate other plugins for grouping candidates as the module count grows.

## Decisions

- **Module icons:** Always required, even in groups. May not display in nav but needed for search and breadcrumbs.
- **Group ordering:** Alphabetical by default. Users can reorder via settings.
- **Group homepage:** No `component` on groups. If a group needs a landing page, make it an explicit first child module. Keeps the contract simple.
- **Nav reorder storage:** Breaking change to nested `NavOrderEntry[]` format. Not backward-compatible — DB version bumps and old data is wiped.
- **Backward compatibility:** Not a concern. We are in POC phase. Pick the most robust solution.

## Related Issues

- [OME-145](https://redhat.atlassian.net/browse/OME-145) — Extract search system into a plugin loaded via MF
- [OME-146](https://redhat.atlassian.net/browse/OME-146) — User-created custom nav groups with PF icon gallery

## Open Questions

- [ ] **Cross-plugin group assignment (explicitly not supported).** Community plugins cannot add pages to another plugin's group. If this becomes a genuine need, it would require a new mechanism (e.g., well-known group IDs that plugins can opt into). Not planned.
