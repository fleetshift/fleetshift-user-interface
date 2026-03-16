import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import type { AppsConfig } from "@scalprum/core";
import type { CanvasPage, NavLayoutEntry } from "../utils/extensions";
import type { PluginEntry } from "./PluginRegistryContext";
import { useAuth } from "./AuthContext";

interface AppConfigContextValue {
  scalprumConfig: AppsConfig<{ assetsHost: string }>;
  canvasPages: CanvasPage[];
  navLayout: NavLayoutEntry[];
  pluginEntries: PluginEntry[];
  assetsHost: string;
}

const AppConfigContext = createContext<AppConfigContextValue | null>(null);

const API_BASE = "http://localhost:4000/api/v1";

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [config, setConfig] = useState<AppConfigContextValue | null>(null);

  useEffect(() => {
    if (!user) return;

    fetch(`${API_BASE}/users/${user.id}/config`)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })
      .then((data) => {
        setConfig({
          scalprumConfig: data.scalprumConfig,
          canvasPages: data.canvasPages,
          navLayout: data.navLayout,
          pluginEntries: data.pluginEntries,
          assetsHost: data.assetsHost,
        });
      })
      .catch((err) => {
        console.error("Failed to load app config:", err);
      });
  }, [user]);

  if (!config) return null;

  return (
    <AppConfigContext.Provider value={config}>
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig(): AppConfigContextValue {
  const ctx = useContext(AppConfigContext);
  if (!ctx)
    throw new Error("useAppConfig must be used within an AppConfigProvider");
  return ctx;
}
