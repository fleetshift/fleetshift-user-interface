# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

FleetShift User Interface — a monorepo containing the frontend GUI, a CLI tool, and mock servers.

## Architecture

npm workspaces monorepo with five packages under `packages/`:

- **`@fleetshift/gui`** — React 18 SPA bundled with webpack. Uses React Router DOM v6, supports TS/CSS/SCSS.
- **`@fleetshift/cli`** — CLI tool (scaffolding only, no source yet).
- **`@fleetshift/mock-servers`** — Express + better-sqlite3 mock API server (port 4000). Provides REST endpoints for clusters, pods, namespaces, metrics, nodes, services, ingresses, storage, alerts, deployments, pipelines, config, gitops, events, routes, upgrades, and user auth/preferences. DB auto-seeds users and schema on startup. Run with `npm run dev --workspace=packages/mock-servers`.
- **`@fleetshift/mock-ui-plugins`** — Mock Scalprum plugins built with webpack and `@openshift/dynamic-plugin-sdk-webpack`. Uses `ts-loader` (not swc) for TypeScript. Plugins live under `src/plugins/<plugin-name>/` and are registered as `DynamicRemotePlugin` instances in `webpack.config.ts`.
- **`@fleetshift/build-utils`** — Shared build utilities consumed by webpack configs. `main` points to `src/index.ts` (no build step needed via tsconfig paths). Exports:
  - `getDynamicModules(root, nodeModulesRoot)` — scans PF packages for dynamic module paths to use as MF shared entries
  - `createTsLoaderRule({ nodeModulesRoot })` — creates a ts-loader webpack rule with the PF import transformer baked in
  - `createTransformer({ nodeModulesRoot })` — lower-level: creates the TS AST transformer directly

Shared TypeScript and ESLint/Prettier configs live at the root. Each package extends the root `tsconfig.json`.

## Commands

```bash
# GUI dev server (port 3000)
npm run dev --workspace=packages/gui

# GUI production build
npm run build --workspace=packages/gui

# Mock plugins: build, watch+serve on port 8001
npm run build --workspace=packages/mock-ui-plugins
npm run serve --workspace=packages/mock-ui-plugins

# Lint all packages
npm run lint

# Lint with auto-fix
npm run lint:fix
```

## Module Federation & Scalprum

The GUI is a **shell app** using Module Federation via `@module-federation/enhanced`. It uses **Scalprum** (`@scalprum/core`, `@scalprum/react-core`) as a runtime abstraction for loading remote micro-frontend modules.

**Important**: The GUI must use **webpack** (not rspack). Rspack's MF runtime has a fundamental incompatibility with Scalprum — it calls `handleInitialConsumes` before any user code runs, breaking share scope initialization on cold start.

**Reference implementation**: `/Users/martin/scalprum/scaffolding/` — always consult this codebase (not general docs or training data) for Scalprum usage patterns. Key reference files:
- `examples/test-app/src/entry.tsx` — ScalprumProvider setup
- `examples/test-app/webpack.config.ts` — shell Module Federation config
- `federation-cdn-mock/webpack.config.js` — remote module config
- `packages/react-core/src/scalprum-component.tsx` — ScalprumComponent internals
- `packages/react-core/src/use-remote-hook.ts` — useRemoteHook internals

**Shell setup pattern**:
- `ScalprumProvider` wraps the app with a `config` (map of remote app metadata with `manifestLocation`) and an `api` object shared with all remotes
- `ScalprumComponent` renders remote modules: `<ScalprumComponent scope="remote-name" module="./ExposedModule" />`
- `useRemoteHook` executes remote React hooks with args and returns `{ loading, error, hookResult }`
- Shared singletons: `react`, `react-dom`, `react-router-dom`, `@scalprum/core`, `@scalprum/react-core`
- Entry point uses async boundary pattern: `index.ts` → `import("./bootstrap")` for MF share scope init

## PatternFly Import Transforms & Module Sharing

PatternFly components are shared individually via Module Federation (each Button, Card, etc. as a separate shared entry) to enable fine-grained sharing between shell and plugins.

**How it works** (two complementary systems):
1. **`getDynamicModules`** — scans `@patternfly/react-core` and `react-icons` for `dist/dynamic/*/` paths and generates per-component MF `shared` entries (e.g. `@patternfly/react-core/dist/dynamic/components/Button`)
2. **`createTsLoaderRule` / `createTransformer`** — a TypeScript AST transformer (forked from `@redhat-cloud-services/tsc-transform-imports`) that rewrites barrel imports at build time:
   - `import { Button, Card } from "@patternfly/react-core"` → `import { Button } from "@patternfly/react-core/dist/dynamic/components/Button"` + `import { Card } from "@patternfly/react-core/dist/dynamic/components/Card"`
   - This ensures the emitted code references the same dynamic paths that `getDynamicModules` registered as shared

**Key details**:
- The transformer is wired via ts-loader's `getCustomTransformers` option — **no ts-patch needed**
- Both `getDynamicModules` and `createTsLoaderRule` require a `nodeModulesRoot` path (monorepo root `node_modules`) because npm hoists PF packages
- The transformer source lives in `packages/build-utils/src/tsc-transform-imports/` (forked locally, not the npm package)
- The original transformer only matched single-quoted imports; our fork matches both `'` and `"` quotes
- The transformer only activates for ES module outputs (`ES2015`/`ES2020`/`ES2022`/`ESNext`)

## Key Conventions

- React 18 (not 19) — uses `react-jsx` transform (no manual React imports needed)
- Webpack with `ts-loader` for TypeScript/TSX (via `createTsLoaderRule` from `@fleetshift/build-utils`)
- tsconfig `ts-node` sections override `"plugins": []` to prevent ts-patch interference when loading webpack configs
- ESLint flat config (`eslint.config.mjs`) with `@typescript-eslint` and Prettier integration
- Prettier: double quotes, trailing commas
- TypeScript strict mode enabled globally

## Scope Model & Cluster Switcher

The shell uses a **scope model** where the user switches between "All Clusters" and a specific cluster via a masthead dropdown (`ClusterSwitcher`). Navigation is deduplicated (one "Pods" item, not one per cluster). Extension components receive `clusterIds: string[]` — global mode passes all relevant IDs, per-cluster mode passes one.

- **`ScopeContext`** (`contexts/ScopeContext.tsx`) — tracks `scope: "all" | clusterId`. Provides `scopedClusterIds` and `clusterIdsForPlugin(pluginKey)` which intersects scope with clusters that have the given plugin enabled. Resets to "all" when the selected cluster is uninstalled.
- **`pluginKeyFromName(pluginName)`** (`utils/extensions.ts`) — derives plugin key from plugin name (e.g. `"core-plugin"` → `"core"`) to match against `cluster.plugins[]`.
- Nav items are filtered by both scope (cluster has plugin) and user preferences.
- Routes use `/:extensionPath` (not `/clusters/:clusterId/:extensionPath`). React Router v6 ranks static segments (`/clusters`) higher than dynamic (`/:extensionPath`).

## User Personas & Preferences

Two personas: **Ops** (manages clusters/infrastructure) and **Dev** (manages applications). Switching is via an Ops/Dev toggle in the masthead — no login flow.

- **`AuthContext`** (`contexts/AuthContext.tsx`) — auto-logs in from localStorage (defaults to "ops"). Exposes `switchUser(username)` to toggle between ops/dev accounts. Two hardcoded users seeded in the mock server DB.
- **`UserPreferencesContext`** (`contexts/UserPreferencesContext.tsx`) — per-user list of enabled extension paths, synced with the server (`PUT /api/v1/users/:id/preferences`). Nav only shows extensions the user has enabled.
- **Marketplace page** (`/marketplace`) — shows all available extensions (only from plugins at least one cluster has enabled) with toggles to show/hide each one in the nav. Grouped by Ops/Dev.
- Default preferences:
  - Ops: pods, ns, metrics, nodes, networking, storage, upgrades, alerts
  - Dev: pods, ns, deployments, logs, pipelines, config, gitops, events, routes

## Plugin Architecture

Plugins are registered in `packages/mock-ui-plugins/webpack.config.ts` as `DynamicRemotePlugin` instances. Each plugin exposes extensions of type `fleetshift.nav-item` and/or `fleetshift.dashboard-widget`. The GUI loads plugins dynamically via Scalprum based on which clusters have them enabled (`buildScalprumConfig` in `utils/buildScalprumConfig.ts`).

**Extension contracts**:
- `fleetshift.nav-item` — `{ label, path, component: CodeRef<ComponentType<{ clusterIds: string[] }>> }`
- `fleetshift.dashboard-widget` — `{ component: CodeRef<ComponentType<{ clusterIds: string[] }>> }`

**Current plugins** (14 total):

| Plugin | Key | Nav Label | Persona |
|--------|-----|-----------|---------|
| core-plugin | core | Pods, Namespaces + dashboard widget | Ops |
| observability-plugin | observability | Observability | Ops |
| nodes-plugin | nodes | Nodes | Ops |
| networking-plugin | networking | Networking | Ops |
| storage-plugin | storage | Storage | Ops |
| upgrades-plugin | upgrades | Upgrades | Ops |
| alerts-plugin | alerts | Alerts | Ops |

| deployments-plugin | deployments | Deployments | Dev |
| logs-plugin | logs | Logs | Dev |
| pipelines-plugin | pipelines | Pipelines | Dev |
| config-plugin | config | Config | Dev |
| gitops-plugin | gitops | GitOps | Dev |
| events-plugin | events | Events | Dev |
| routes-plugin | routes | Routes | Dev |

Each plugin directory under `packages/mock-ui-plugins/src/plugins/<name>-plugin/` contains an `api.ts` (shared `useApiBase`/`fetchJson` helpers via Scalprum's API object) and component file(s).

## Component Tree

```
ScopeInitializer > BrowserRouter > AuthProvider > AuthGate > ClusterProvider > ScalprumShell > PluginLoader > ScopeProvider > UserPreferencesProvider > Routes > AppLayout > Outlet
```

## Verification & Debugging

- **Do not run build/dev commands** to verify changes. Use the available MCP tools instead:
  - **LSP diagnostics** (`mcp__ide__getDiagnostics`) — check for TypeScript and lint errors without running a build.
  - **Browser MCP** (`mcp__browsermcp__browser_screenshot`, `mcp__browsermcp__browser_snapshot`) — visually verify the running app and inspect the DOM. The dev server is typically already running on port 3000.
- Only use `npm run build` or `npm run dev` when explicitly asked by the user.
