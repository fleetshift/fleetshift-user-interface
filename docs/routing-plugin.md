# Routing Plugin — Cross-Plugin Linking

The routing plugin enables plugins to link to each other without hardcoding paths. Since the shell uses dynamic canvas pages with user-defined paths, plugins cannot know at build time where another page lives. The routing plugin resolves paths at runtime via the Scalprum API using **module references** (`scope` + `module` name).

## Architecture

```
Shell (App.tsx)
  └─ Scalprum API: getPluginPagePath(scope, module) → "/resolved-path" | undefined
       ▲ reads from canvasPagesRef + navLayoutRef (synced by CanvasPagesBridge)

Routing Plugin (routing-plugin)
  ├─ PluginLink        — declarative <Link> wrapper
  ├─ usePluginNavigate — imperative hook (consumed via useRemoteHook)
  └─ usePluginLinks    — multi-target hook for multiple module links
```

The routing plugin is a **utility plugin** — it has no nav items, no dashboard widgets, and is not tied to any cluster. It is always loaded regardless of which clusters are installed.

## Resolution Algorithm

`getPluginPagePath(scope: string, module: string) → string | undefined`

1. Find all canvas pages containing a `CanvasModule` with matching `moduleRef.scope` and `moduleRef.module`
2. Partition matches into "in nav" vs "not in nav" (using the `isPageInLayout` helper)
3. Within each partition, sort by path specificity: segment count descending (more segments = more specific)
4. Return first "in nav" match, or fall back to first "not in nav" match
5. No matches → `undefined`

This approach is resilient to user-created pages — different users can have different paths for the same module, and the resolution always finds the best available page.

## Shell-Side Setup

### Scalprum API: `getPluginPagePath`

The shell exposes `getPluginPagePath` on the `api.fleetshift` object passed to `ScalprumProvider`. It resolves a module reference (scope + module name) to its full route path:

```ts
api.fleetshift.getPluginPagePath("core-plugin", "DeploymentDetailsPage")
// → "/deployment-details" if a canvas page containing that module exists
// → undefined if no matching page
```

Internally, it reads from module-level refs (`canvasPagesRef` and `navLayoutRef`) that are synced from `UserPreferencesContext` by the `CanvasPagesBridge` component.

### Always-Loaded Config

In `buildScalprumConfig.ts`, the routing plugin is unconditionally added using `manifestLocation` (not inline `pluginManifest`). This lets Scalprum lazily fetch the manifest from the network:

```ts
config["routing-plugin"] = {
  name: "routing-plugin",
  manifestLocation: `${registry.assetsHost}/routing-plugin-manifest.json`,
  assetsHost: registry.assetsHost,
};
```

Because the routing plugin uses `manifestLocation` (fetched at runtime) rather than inline `pluginManifest` (embedded in the registry), its `loadScripts` paths are relative. The shell's `transformPluginManifest` callback in `ScalprumProvider` prefixes them with the `assetsHost` to make them absolute:

```tsx
transformPluginManifest: (manifest) => {
  const newManifest = { ...manifest };
  if (manifest.name === "routing-plugin") {
    newManifest.loadScripts = manifest.loadScripts.map((script) =>
      script.startsWith("http") ? script : `${registry.assetsHost}/${script}`,
    );
  }
  return newManifest;
},
```

## Plugin Modules

### `PluginLink` (declarative)

A `<Link>` wrapper that resolves the target module to a canvas page at render time.

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `scope` | `string` | Plugin name (e.g. `"core-plugin"`) |
| `module` | `string` | Exposed module name (e.g. `"DeploymentDetailsPage"`) |
| `to` | `To` (optional) | Sub-path relative to the resolved page |
| `fallback` | `ReactNode` (optional) | Content to render when the target page doesn't exist (default: `null`) |
| `children` | `ReactNode` | Link content |
| `...rest` | `LinkProps` | Passed through to react-router-dom `<Link>` |

**Fallback:** If the target module isn't on any canvas page, renders the `fallback` content (or nothing if no fallback is provided).

**Usage via `ScalprumComponent`:**

```tsx
<ScalprumComponent
  scope="routing-plugin"
  module="PluginLink"
  fallback={<span>Loading...</span>}
  scope="core-plugin"
  module="DeploymentDetailsPage"
  to="metrics"
>
  View Metrics
</ScalprumComponent>
```

### `usePluginNavigate` (imperative)

A remote hook for programmatic navigation. Consumed via Scalprum's `useRemoteHook`.

**Signature:** `(scope: string, module: string) => { navigate: (to?: string | { pathname?: string; search?: string }) => void; available: boolean }`

Returns an object with:
- `navigate` — function to navigate to the resolved page, accepts an optional sub-path string or an object with `pathname` and `search`
- `available` — `boolean` indicating whether the target module exists on any canvas page

**Usage:**

```tsx
import { useRemoteHook } from "@scalprum/react-core";

const navigateArgs = useMemo(() => ["core-plugin", "DeploymentDetailsPage"], []);
const { hookResult, loading, error } = useRemoteHook<{
  navigate: (to?: string | { pathname?: string; search?: string }) => void;
  available: boolean;
}>({
  scope: "routing-plugin",
  module: "usePluginNavigate",
  args: navigateArgs,
});

const navigateToPlugin = hookResult?.navigate;
const actionsDisabled = loading || !!error || !(hookResult?.available ?? false);

// Navigate to the resolved page:
navigateToPlugin?.();
// → /deployment-details

// With sub-path:
navigateToPlugin?.("metrics");
// → /deployment-details/metrics

// With query params:
navigateToPlugin?.({ search: "?namespace=production" });
// → /deployment-details?namespace=production

// With sub-path + query params:
navigateToPlugin?.({ pathname: "metrics", search: "?namespace=production" });
// → /deployment-details/metrics?namespace=production
```

**Important:** The `module` value in `useRemoteHook` must match the key in `exposedModules` exactly (e.g. `"usePluginNavigate"`, not `"./usePluginNavigate"`). The `scope` and `module` arguments to the hook itself refer to the **target** plugin module.

### `usePluginLinks` (multi-target)

A remote hook for resolving links to multiple modules in a single call. Useful when a component needs to link to several different plugin modules.

**Signature:** `(targets: { scope: string; module: string }[]) => Record<string, { navigate: (to?: string | { pathname?: string; search?: string }) => void; available: boolean }>`

Returns a record keyed by `"scope/module"` with `{ navigate, available }` entries.

**Usage:**

```tsx
import { useRemoteHook } from "@scalprum/react-core";

const targets = useMemo(() => [
  { scope: "core-plugin", module: "DeploymentDetailsPage" },
  { scope: "observability-plugin", module: "MetricsDashboard" },
], []);
const { hookResult: links } = useRemoteHook<
  Record<string, { navigate: Function; available: boolean }>
>({
  scope: "routing-plugin",
  module: "usePluginLinks",
  args: [targets],
});

const depLink = links?.["core-plugin/DeploymentDetailsPage"];
const metricsLink = links?.["observability-plugin/MetricsDashboard"];

// Navigate if available:
if (depLink?.available) depLink.navigate({ search: "?namespace=prod" });
```

## Webpack Registration

The routing plugin is registered in `packages/mock-ui-plugins/webpack.config.ts` as a `DynamicRemotePlugin` with no extensions:

```ts
const RoutingPlugin = new DynamicRemotePlugin({
  extensions: [],
  sharedModules,
  entryScriptFilename: "routing-plugin.[contenthash].js",
  pluginManifestFilename: "routing-plugin-manifest.json",
  moduleFederationSettings: mfOverride,
  pluginMetadata: {
    name: "routing-plugin",
    version: "1.0.0",
    exposedModules: {
      PluginLink: "./src/plugins/routing-plugin/PluginLink.tsx",
      usePluginNavigate: "./src/plugins/routing-plugin/usePluginNavigate.tsx",
      usePluginLinks: "./src/plugins/routing-plugin/usePluginLinks.tsx",
    },
  },
});
```

It is also registered in the `PluginRegistryPlugin` plugins list so it appears in the plugin registry.

## Example: PodList Actions Column

The core-plugin's `PodList.tsx` demonstrates cross-plugin linking with a kebab menu (PatternFly `ActionsColumn`) on each pod row:

```tsx
const navigateArgs = useMemo(
  () => ["core-plugin", "DeploymentDetailsPage"],
  [],
);
const {
  hookResult,
  loading: hookLoading,
  error: hookError,
} = useRemoteHook<{
  navigate: (to?: string | { pathname?: string; search?: string }) => void;
  available: boolean;
}>({
  scope: "routing-plugin",
  module: "usePluginNavigate",
  args: navigateArgs,
});

const navigateToPlugin = hookResult?.navigate;
const actionsDisabled =
  hookLoading || !!hookError || !(hookResult?.available ?? false);

// In table row — passes the pod's namespace as a query param:
<Td isActionCell>
  <ActionsColumn
    isDisabled={actionsDisabled}
    items={(() => {
      const ns = pod.namespace_id.replace(`${pod.cluster_id}-`, "");
      const search = `?namespace=${ns}`;
      return [
        { title: "View Deployment", onClick: () => navigateToPlugin?.({ search }) },
        { title: "Deployment Metrics", onClick: () => navigateToPlugin?.({ pathname: "metrics", search }) },
        { title: "Deployment Pods", onClick: () => navigateToPlugin?.({ pathname: "pods", search }) },
      ];
    })()}
  />
</Td>
```

The deployment details page reads the `namespace` query param via `useSearchParams()` and filters its API fetch accordingly.

## Gotchas

- **Module names:** When using `useRemoteHook` or `ScalprumComponent`, the `module` prop must match the `exposedModules` key exactly — no `./` prefix. The `scope` and `module` **arguments** to `usePluginNavigate` refer to the target plugin's scope and module name.
- **Manifest loading:** Plugins loaded via `manifestLocation` (URL fetch) get relative `loadScripts` paths. The shell's `transformPluginManifest` must prefix them with the assets host. Plugins loaded via inline `pluginManifest` (from the registry) already have correct paths. If all will be on same origin this will not be an issue.
- **Graceful degradation:** If the target module isn't on any canvas page, `getPluginPagePath` returns `undefined`. `PluginLink` renders its `fallback` (or nothing), and `usePluginNavigate` returns `available: false` with a no-op `navigate` function. Use the `available` flag to disable UI elements like action buttons.
- **Nav priority:** The resolution algorithm prefers pages that appear in the user's nav layout. If a module appears on multiple pages, pages in the nav take priority. Within each group, more specific paths (more segments) are preferred.
- **Re-resolution:** `usePluginNavigate` re-resolves the base path at call time (not just at hook init), so if canvas pages change after the hook mounts, navigation stays fresh.
- **No cluster dependency:** The routing plugin has key `"routing"` but no cluster lists it in its `plugins[]` array. It bypasses the cluster-based filtering in `buildScalprumConfig`.
- **DB re-seeding:** After modifying seed data in `db.ts`, delete `packages/mock-servers/fleetshift.db` and restart the mock server to re-seed.
