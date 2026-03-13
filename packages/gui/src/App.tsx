import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ScalprumProvider } from "@scalprum/react-core";
import { useScalprum } from "@scalprum/react-core";
import { initSharedScope } from "@scalprum/core";
import { PropsWithChildren, useEffect, useMemo, useRef, useState } from "react";
import { AppLayout } from "./layouts/AppLayout";
import { ClusterProvider, useClusters } from "./contexts/ClusterContext";
import { ScopeProvider, useScope } from "./contexts/ScopeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { UserPreferencesProvider } from "./contexts/UserPreferencesContext";
import { PluginRegistryProvider } from "./contexts/PluginRegistryContext";
import { AppConfigProvider, useAppConfig } from "./contexts/AppConfigContext";
import { useUserPreferences } from "./contexts/UserPreferencesContext";
import type {
  CanvasPage as CanvasPageDef,
  NavLayoutEntry,
} from "./utils/extensions";
import { isPageInLayout } from "./utils/extensions";
import { Dashboard } from "./pages/Dashboard";
import { ClusterListPage } from "./pages/ClusterListPage";
import { MarketplacePage } from "./pages/MarketplacePage";
import { CanvasPageListPage } from "./pages/CanvasPageListPage";
import { CanvasPage } from "./pages/CanvasPage";

const API_BASE = "http://localhost:4000/api/v1";

// Module-level refs for scope — ScopeProvider is nested inside ScalprumShell,
// so we use refs + listeners to bridge scope into the Scalprum API object.
const scopeRef = { current: "all" as string };
const scopeListenersRef = { current: new Set<() => void>() };
const canvasPagesRef = { current: [] as CanvasPageDef[] };
const navLayoutRef = { current: [] as NavLayoutEntry[] };

const ScopeInitializer = ({ children }: PropsWithChildren) => {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    initSharedScope().then(() => {
      setLoading(false);
    });
  }, []);
  if (loading) return null;
  return <>{children}</>;
};

const PluginLoader = ({ children }: PropsWithChildren) => {
  const { pluginStore, config } = useScalprum();
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    const loads: Promise<void>[] = [];

    for (const entry of Object.values(config)) {
      if (entry.pluginManifest) {
        // Inline manifest — load directly into the plugin store
        loads.push(pluginStore.loadPlugin(entry.pluginManifest));
      } else if (entry.manifestLocation) {
        // URL manifest — fetch and load
        loads.push(pluginStore.loadPlugin(entry.manifestLocation));
      }
    }

    if (loads.length === 0) {
      setInitialLoad(false);
      return;
    }

    Promise.all(loads).then(() => setInitialLoad(false));
  }, [config, pluginStore]);

  if (initialLoad) return null;
  return <>{children}</>;
};

const ScalprumShell = ({ children }: PropsWithChildren) => {
  const { installed } = useClusters();
  const { scalprumConfig, assetsHost } = useAppConfig();

  const installedRef = useRef(installed);
  installedRef.current = installed;

  // Notify plugins when cluster data changes
  const clusterListenersRef = useRef<Set<() => void>>(new Set());
  useEffect(() => {
    clusterListenersRef.current.forEach((fn) => fn());
  }, [installed]);

  const api = useMemo(
    () => ({
      fleetshift: {
        apiBase: API_BASE,
        getClusterIdsForPlugin: (pluginKey: string) =>
          installedRef.current
            .filter((c) => c.plugins.includes(pluginKey))
            .map((c) => c.id),
        onClustersChange: (fn: () => void) => {
          clusterListenersRef.current.add(fn);
          return () => {
            clusterListenersRef.current.delete(fn);
          };
        },
        getPluginPagePath: (scope: string, module: string) => {
          const matchingPages = canvasPagesRef.current.filter((page) =>
            page.modules.some(
              (m) =>
                m.moduleRef.scope === scope && m.moduleRef.module === module,
            ),
          );
          if (matchingPages.length === 0) return undefined;

          const bySpecificity = (a: CanvasPageDef, b: CanvasPageDef) =>
            b.path.split("/").length - a.path.split("/").length;

          const inNav = matchingPages
            .filter((p) => isPageInLayout(navLayoutRef.current, p.id))
            .sort(bySpecificity);
          const notInNav = matchingPages
            .filter((p) => !isPageInLayout(navLayoutRef.current, p.id))
            .sort(bySpecificity);

          const best = inNav[0] ?? notInNav[0];
          return best ? `/${best.path}` : undefined;
        },
        getScope: () => scopeRef.current,
        onScopeChange: (fn: () => void) => {
          scopeListenersRef.current.add(fn);
          return () => {
            scopeListenersRef.current.delete(fn);
          };
        },
      },
    }),
    [],
  );

  return (
    <ScalprumProvider
      config={scalprumConfig}
      api={api}
      pluginSDKOptions={{
        pluginLoaderOptions: {
          transformPluginManifest: (manifest) => {
            // noo-op transfor to not use the default transform. That would append the `auto` prefix (our public path) to the loadScripts URLs
            const newManifest = { ...manifest };
            if (manifest.name === "routing-plugin") {
              // For the routing plugin, we want to ensure the manifestLocation is absolute so it can be loaded from the public directory
              newManifest.loadScripts = manifest.loadScripts.map((script) =>
                script.startsWith("http")
                  ? script
                  : `${assetsHost}/${script}`,
              );
            }
            return newManifest;
          },
        },
      }}
    >
      <PluginLoader>{children}</PluginLoader>
    </ScalprumProvider>
  );
};

/** Syncs the ScopeProvider's scope value to the module-level ref so the
 *  Scalprum API (created outside ScopeProvider) can expose it to plugins. */
const ScopeBridge = () => {
  const { scope } = useScope();
  useEffect(() => {
    scopeRef.current = scope;
    scopeListenersRef.current.forEach((fn) => fn());
  }, [scope]);
  return null;
};

/** Syncs canvas pages into the module-level ref so the Scalprum API
 *  (created outside UserPreferencesProvider) can expose them to plugins. */
const CanvasPagesBridge = () => {
  const { canvasPages, navLayout } = useUserPreferences();
  useEffect(() => {
    canvasPagesRef.current = canvasPages;
    navLayoutRef.current = navLayout;
  }, [canvasPages, navLayout]);
  return null;
};

const AuthGate = ({ children }: PropsWithChildren) => {
  const { loading, user, login } = useAuth();
  const loginTriggered = useRef(false);

  useEffect(() => {
    if (!loading && !user && !loginTriggered.current) {
      loginTriggered.current = true;
      login();
    }
  }, [loading, user, login]);

  if (loading || !user) return null;

  return <>{children}</>;
};

const AppRoutes = () => {
  const { canvasPages } = useUserPreferences();

  // Sort by path length descending — longest (most specific) first
  const sortedPages = useMemo(
    () => [...canvasPages].sort((a, b) => b.path.length - a.path.length),
    [canvasPages],
  );

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clusters" element={<ClusterListPage />} />
        <Route path="/navigation" element={<MarketplacePage />} />
        <Route path="/pages" element={<CanvasPageListPage />} />
        <Route path="/pages/:pageId" element={<CanvasPage />} />
        {sortedPages.map((page) => (
          <Route
            key={page.id}
            path={`/${page.path}/*`}
            element={<CanvasPage pageId={page.id} />}
          />
        ))}
        <Route path="*" element={<CanvasPage />} />
      </Route>
    </Routes>
  );
};

const AppConfigBridge = ({ children }: PropsWithChildren) => {
  const { pluginEntries, assetsHost, canvasPages, navLayout } = useAppConfig();

  return (
    <PluginRegistryProvider pluginEntries={pluginEntries} assetsHost={assetsHost}>
      <ClusterProvider>
        <ScalprumShell>
          <ScopeProvider>
            <ScopeBridge />
            <UserPreferencesProvider
              initialNavLayout={navLayout}
              initialCanvasPages={canvasPages}
            >
              <CanvasPagesBridge />
              {children}
            </UserPreferencesProvider>
          </ScopeProvider>
        </ScalprumShell>
      </ClusterProvider>
    </PluginRegistryProvider>
  );
};

export const App = () => (
  <ScopeInitializer>
    <BrowserRouter>
      <AuthProvider>
        <AuthGate>
          <AppConfigProvider>
            <AppConfigBridge>
              <AppRoutes />
            </AppConfigBridge>
          </AppConfigProvider>
        </AuthGate>
      </AuthProvider>
    </BrowserRouter>
  </ScopeInitializer>
);
