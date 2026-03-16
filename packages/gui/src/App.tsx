import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ScalprumProvider } from "@scalprum/react-core";
import { useScalprum } from "@scalprum/react-core";
import { initSharedScope } from "@scalprum/core";
import { PropsWithChildren, useEffect, useMemo, useRef, useState } from "react";
import { AppLayout } from "./layouts/AppLayout";
import { ClusterProvider, useClusters } from "./contexts/ClusterContext";
import { ScopeProvider, useScope } from "./contexts/ScopeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { PluginRegistryProvider } from "./contexts/PluginRegistryContext";
import { AppConfigProvider, useAppConfig } from "./contexts/AppConfigContext";
import { subscribe as eventBusSubscribe } from "./hooks/useInvalidationSocket";
import { PluginPage } from "./pages/PluginPage";
import { AddClusterPage } from "./pages/ClusterListPage";

const API_BASE = "http://localhost:4000/api/v1";

const scopeRef = { current: "all" as string };
const scopeListenersRef = { current: new Set<() => void>() };

const ScopeInitializer = ({ children }: PropsWithChildren) => {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    initSharedScope().then(() => setLoading(false));
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
        loads.push(pluginStore.loadPlugin(entry.pluginManifest));
      } else if (entry.manifestLocation) {
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
        getScope: () => scopeRef.current,
        onScopeChange: (fn: () => void) => {
          scopeListenersRef.current.add(fn);
          return () => {
            scopeListenersRef.current.delete(fn);
          };
        },
        on: eventBusSubscribe,
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
            const newManifest = { ...manifest };
            if (manifest.name === "routing-plugin") {
              newManifest.loadScripts = manifest.loadScripts.map((script) =>
                script.startsWith("http") ? script : `${assetsHost}/${script}`,
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

const ScopeBridge = () => {
  const { scope } = useScope();
  useEffect(() => {
    scopeRef.current = scope;
    scopeListenersRef.current.forEach((fn) => fn());
  }, [scope]);
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
  const { pluginPages } = useAppConfig();

  const sortedPages = useMemo(
    () => [...pluginPages].sort((a, b) => b.path.length - a.path.length),
    [pluginPages],
  );

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/clusters/add" element={<AddClusterPage />} />
        {sortedPages.map((page) => (
          <Route
            key={page.id}
            path={`/${page.path}`}
            element={
              <PluginPage
                scope={page.scope}
                module={page.module}
                pluginKey={page.pluginKey}
              />
            }
          />
        ))}
      </Route>
    </Routes>
  );
};

const AppConfigBridge = ({ children }: PropsWithChildren) => {
  const { pluginEntries, assetsHost } = useAppConfig();

  return (
    <PluginRegistryProvider
      pluginEntries={pluginEntries}
      assetsHost={assetsHost}
    >
      <ClusterProvider>
        <ScalprumShell>
          <ScopeProvider>
            <ScopeBridge />
            {children}
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
