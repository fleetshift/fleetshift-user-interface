import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ScalprumProvider, ScalprumComponent } from "@scalprum/react-core";
import { AppsConfig, initSharedScope } from "@scalprum/core";
import { AppLayout } from "./layouts/AppLayout";
import { PropsWithChildren, useEffect, useState } from "react";

const config: AppsConfig = {
  "example-plugin": {
    name: "example-plugin",
    manifestLocation: "http://localhost:8001/plugin-manifest.json",
  },
};

const ScopeInitializer = ({ children }: PropsWithChildren) => {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    // Initialize the shared scope for module federation
    initSharedScope().then(() => {
      setLoading(false);
    });
  }, []);
  if (loading) {
    return <div>Loading...</div>;
  }
  return <>{children}</>;
};

export const App = () => (
  <ScopeInitializer>
    <ScalprumProvider
      config={config}
      api={{}}
      pluginSDKOptions={{
        pluginLoaderOptions: {
          transformPluginManifest(manifest) {
            const host = "http://localhost:8001";
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
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<div>FleetShift</div>} />
            <Route
              path="/example"
              element={
                <ScalprumComponent
                  scope="example-plugin"
                  module="./ExamplePage"
                  fallback={<div>Loading plugin...</div>}
                  ErrorComponent={<div>Failed to load plugin</div>}
                />
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </ScalprumProvider>
  </ScopeInitializer>
);
