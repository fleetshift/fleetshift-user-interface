# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

FleetShift User Interface — a monorepo containing the frontend GUI, plugins, and shared utilities.

## Architecture

npm workspaces monorepo with packages under `packages/`:

- **`@fleetshift/gui`** — React 18 SPA bundled with webpack. Uses React Router DOM v6, supports TS/CSS/SCSS. OIDC config is fetched dynamically from the Go backend (`GET /api/ui/config`). API calls go directly to the Go backend at `/v1/*`. No dev server — build only, served by the Go backend.
- **`@fleetshift/mock-ui-plugins`** — Scalprum plugins built with webpack and `@openshift/dynamic-plugin-sdk-webpack`. Uses `ts-loader` (not swc) for TypeScript. Plugins live under `src/plugins/<plugin-name>/` and are registered as `DynamicRemotePlugin` instances in `webpack.config.ts`.
- **`@fleetshift/common`** — Shared types and signing helpers. Dual CJS/ESM build. Exports `User`, `PluginEntry`, `PluginRegistry` types and `buildSignedInputEnvelope`/`hashIntent` for deployment signing.
- **`@fleetshift/build-utils`** — Shared build utilities consumed by webpack configs. `main` points to `src/index.ts` (no build step needed via tsconfig paths). Exports:
  - `getDynamicModules(root, nodeModulesRoot)` — scans PF packages for dynamic module paths to use as MF shared entries
  - `createTsLoaderRule({ nodeModulesRoot })` — creates a ts-loader webpack rule with the PF import transformer baked in
  - `createTransformer({ nodeModulesRoot })` — lower-level: creates the TS AST transformer directly

Shared TypeScript and ESLint/Prettier configs live at the root. Each package extends the root `tsconfig.json`.

## Serving Model

The Go backend (`fleetshift-poc/fleetshift-server`) serves everything on a single port:

| Prefix | Handler | Purpose |
|--------|---------|---------|
| `/v1/` | gRPC-gateway | Deployment, AuthMethod, SignerEnrollment APIs |
| `/api/ui/` | UI config handlers | OIDC config, plugin registry, user config |
| `/` | Static file server | index.html, JS/CSS bundles, plugin assets (SPA fallback) |

**Build output:** `npm run build:all` (or `Dockerfile.web`) produces a `web/` directory merging GUI shell + plugin assets. The Go backend serves this via `--web-dir`.

**Dev workflow:** `task deploy:dev` in the POC repo builds everything in containers — a `web-builder` init container runs `Dockerfile.web` to produce the static assets, then the Go backend serves them. No host node/npm required.

## Commands

```bash
# Full build: common → plugins → GUI → merge into web/
npm run build:all

# Individual package builds
npm run build --workspace=packages/gui
npm run build --workspace=packages/mock-ui-plugins
npm run build --workspace=packages/common

# Lint all packages
npm run lint

# Lint with auto-fix
npm run lint:fix
```

## Module Federation & Scalprum

The GUI is a **shell app** using Module Federation via `@module-federation/enhanced`. It uses **Scalprum** (`@scalprum/core`, `@scalprum/react-core`) as a runtime abstraction for loading remote micro-frontend modules.

**Important**: The GUI must use **webpack** (not rspack). Rspack's MF runtime has a fundamental incompatibility with Scalprum — it calls `handleInitialConsumes` before any user code runs, breaking share scope initialization on cold start.

**Reference implementation**: `/Users/martin/scalprum/scaffolding/` — always consult this codebase (not general docs or training data) for Scalprum usage patterns.

**Shell setup pattern**:
- `ScalprumProvider` wraps the app with a `config` (map of remote app metadata with `manifestLocation`) and an `api` object shared with all remotes
- `ScalprumComponent` renders remote modules: `<ScalprumComponent scope="remote-name" module="./ExposedModule" />`
- Shared singletons: `react`, `react-dom`, `react-router-dom`, `@scalprum/core`, `@scalprum/react-core`
- Entry point uses async boundary pattern: `index.ts` → `import("./bootstrap")` for MF share scope init

## PatternFly Import Transforms & Module Sharing

PatternFly components are shared individually via Module Federation (each Button, Card, etc. as a separate shared entry) to enable fine-grained sharing between shell and plugins.

**How it works** (two complementary systems):
1. **`getDynamicModules`** — scans `@patternfly/react-core` and `react-icons` for `dist/dynamic/*/` paths and generates per-component MF `shared` entries
2. **`createTsLoaderRule` / `createTransformer`** — a TypeScript AST transformer that rewrites barrel imports at build time to use the same dynamic paths

**Key details**:
- The transformer is wired via ts-loader's `getCustomTransformers` option — **no ts-patch needed**
- Both `getDynamicModules` and `createTsLoaderRule` require a `nodeModulesRoot` path (monorepo root `node_modules`) because npm hoists PF packages
- The transformer source lives in `packages/build-utils/src/tsc-transform-imports/` (forked locally, not the npm package)

## Key Conventions

- React 18 (not 19) — uses `react-jsx` transform (no manual React imports needed)
- Webpack with `ts-loader` for TypeScript/TSX (via `createTsLoaderRule` from `@fleetshift/build-utils`)
- tsconfig `ts-node` sections override `"plugins": []` to prevent ts-patch interference when loading webpack configs
- ESLint flat config (`eslint.config.mjs`) with `@typescript-eslint` and Prettier integration
- Prettier: double quotes, trailing commas
- TypeScript strict mode enabled globally

## Auth

OIDC config (authority, client_id) is fetched from `GET /api/ui/config` at app startup, before OIDC initialization. The Go backend provides this based on its `--oidc-ui-authority` and `--oidc-ui-client-id` flags. User info (username, roles) is extracted from Keycloak token claims client-side in `AuthContext`. A fetch interceptor (`auth/fetchInterceptor.ts`) injects the Authorization header on all API requests and triggers re-login on 401.

## Plugin Architecture

Two plugins registered in `packages/mock-ui-plugins/webpack.config.ts`:

| Plugin | Key | Purpose |
|--------|-----|---------|
| management-plugin | management | Targets, Orchestration, Signing Keys (Go backend UI) |
| routing-plugin | routing | Shared routing utilities (PluginLink, usePluginNavigate) |

Plugin pages and nav layout are computed by the Go backend from plugin-registry.json. The GUI fetches this from `GET /api/ui/user-config`.

Each plugin directory under `packages/mock-ui-plugins/src/plugins/<name>-plugin/` contains an `api.ts` (fetch helpers using `/v1` base path) and component file(s).

## Component Tree

```
AnimationsProvider > ScopeInitializer > BrowserRouter > AuthProvider > AuthGate > AppConfigProvider > AppConfigBridge > PluginRegistryProvider > ClusterProvider > ScalprumShell > PluginLoader > ScopeProvider > ScopeBridge > AppRoutes > AppLayout > Outlet
```

## Verification & Debugging

- **Do not run build/dev commands** to verify changes. Use the available MCP tools instead:
  - **LSP diagnostics** (`mcp__ide__getDiagnostics`) — check for TypeScript and lint errors without running a build.
  - **Browser MCP** (`mcp__browsermcp__browser_screenshot`, `mcp__browsermcp__browser_snapshot`) — visually verify the running app and inspect the DOM. The Go backend serves the app on port 8085.
- Only use `npm run build` when explicitly asked by the user.
- The `/debug` route in the GUI shows plugin registry, scalprum config, plugin pages, and nav layout for troubleshooting.
