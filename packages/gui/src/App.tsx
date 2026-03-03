import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ScalprumProvider } from "@scalprum/react-core";
import { useScalprum } from "@scalprum/react-core";
import { initSharedScope } from "@scalprum/core";
import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import { AppLayout } from "./layouts/AppLayout";
import { ClusterProvider, useClusters } from "./contexts/ClusterContext";
import { ScopeProvider } from "./contexts/ScopeContext";
import { buildScalprumConfig } from "./utils/buildScalprumConfig";
import { Dashboard } from "./pages/Dashboard";
import { ClusterListPage } from "./pages/ClusterListPage";
import { ClusterDetailPage } from "./pages/ClusterDetailPage";
import { ExtensionPage } from "./pages/ExtensionPage";

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

  const api = useMemo(
    () => ({
      fleetshift: { apiBase: API_BASE },
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

export const App = () => (
  <ScopeInitializer>
    <BrowserRouter>
      <ClusterProvider>
        <ScalprumShell>
          <ScopeProvider>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/clusters" element={<ClusterListPage />} />
                <Route
                  path="/clusters/:clusterId"
                  element={<ClusterDetailPage />}
                />
                <Route path="/:extensionPath" element={<ExtensionPage />} />
              </Route>
            </Routes>
          </ScopeProvider>
        </ScalprumShell>
      </ClusterProvider>
    </BrowserRouter>
  </ScopeInitializer>
);
