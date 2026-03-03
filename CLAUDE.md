# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

FleetShift User Interface — a monorepo containing the frontend GUI, a CLI tool, and mock servers.

## Architecture

npm workspaces monorepo with five packages under `packages/`:

- **`@fleetshift/gui`** — React 18 SPA bundled with webpack. Uses React Router DOM v6, supports TS/CSS/SCSS.
- **`@fleetshift/cli`** — CLI tool (scaffolding only, no source yet).
- **`@fleetshift/mock-servers`** — Mock servers (scaffolding only, no source yet).
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

## Verification & Debugging

- **Do not run build/dev commands** to verify changes. Use the available MCP tools instead:
  - **LSP diagnostics** (`mcp__ide__getDiagnostics`) — check for TypeScript and lint errors without running a build.
  - **Browser MCP** (`mcp__browsermcp__browser_screenshot`, `mcp__browsermcp__browser_snapshot`) — visually verify the running app and inspect the DOM. The dev server is typically already running on port 3000.
- Only use `npm run build` or `npm run dev` when explicitly asked by the user.
