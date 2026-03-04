import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ScalprumProvider } from "@scalprum/react-core";
import { useScalprum } from "@scalprum/react-core";
import { initSharedScope } from "@scalprum/core";
import { PropsWithChildren, useEffect, useMemo, useRef, useState } from "react";
import { AppLayout } from "./layouts/AppLayout";
import { ClusterProvider, useClusters } from "./contexts/ClusterContext";
import { ScopeProvider } from "./contexts/ScopeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { UserPreferencesProvider } from "./contexts/UserPreferencesContext";
import { buildScalprumConfig } from "./utils/buildScalprumConfig";
import { Dashboard } from "./pages/Dashboard";
import { ClusterListPage } from "./pages/ClusterListPage";
import { MarketplacePage } from "./pages/MarketplacePage";
import { CanvasPageListPage } from "./pages/CanvasPageListPage";
import { CanvasPage } from "./pages/CanvasPage";

const API_BASE = "http://localhost:4000/api/v1";

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
    const manifests = Object.values(config)
      .map((entry) => entry.manifestLocation)
      .filter(Boolean) as string[];

    if (manifests.length === 0) {
      setInitialLoad(false);
      return;
    }

    Promise.all(manifests.map((m) => pluginStore.loadPlugin(m))).then(() =>
      setInitialLoad(false),
    );
  }, [config, pluginStore]);

  if (initialLoad) return null;
  return <>{children}</>;
};

const ScalprumShell = ({ children }: PropsWithChildren) => {
  const { installed } = useClusters();
  const config = useMemo(() => buildScalprumConfig(installed), [installed]);

  const installedRef = useRef(installed);
  installedRef.current = installed;

  const api = useMemo(
    () => ({
      fleetshift: {
        apiBase: API_BASE,
        getClusterIdsForPlugin: (pluginKey: string) =>
          installedRef.current
            .filter((c) => c.plugins.includes(pluginKey))
            .map((c) => c.id),
      },
    }),
    [],
  );

  return (
    <ScalprumProvider
      config={config}
      api={api}
      pluginSDKOptions={{
        pluginLoaderOptions: {
          transformPluginManifest(manifest) {
            const entry = config[manifest.name];
            const host =
              entry && "assetsHost" in entry
                ? (entry as { assetsHost: string }).assetsHost
                : "http://localhost:8001";
            return {
              ...manifest,
              loadScripts: manifest.loadScripts.map(
                (script) => `${host}/${script}`,
              ),
            };
          },
        },
      }}
    >
      <PluginLoader>{children}</PluginLoader>
    </ScalprumProvider>
  );
};

const AuthGate = ({ children }: PropsWithChildren) => {
  const { loading } = useAuth();
  if (loading) return null;
  return <>{children}</>;
};

export const App = () => (
  <ScopeInitializer>
    <BrowserRouter>
      <AuthProvider>
        <AuthGate>
          <ClusterProvider>
            <ScalprumShell>
              <ScopeProvider>
                <UserPreferencesProvider>
                  <Routes>
                    <Route element={<AppLayout />}>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/clusters" element={<ClusterListPage />} />
                      <Route path="/navigation" element={<MarketplacePage />} />
                      <Route path="/pages" element={<CanvasPageListPage />} />
                      <Route path="/pages/:pageId" element={<CanvasPage />} />
                      <Route path="*" element={<CanvasPage />} />
                    </Route>
                  </Routes>
                </UserPreferencesProvider>
              </ScopeProvider>
            </ScalprumShell>
          </ClusterProvider>
        </AuthGate>
      </AuthProvider>
    </BrowserRouter>
  </ScopeInitializer>
);
