import { createContext, useContext, useEffect, useRef, ReactNode, useCallback } from "react";
import { useResolvedExtensions } from "@openshift/dynamic-plugin-sdk";
import { useAppConfig } from "../../contexts/AppConfigContext";
import { isSearchIndexExtension } from "../../extensions/isSearchIndexExtension";
import type { SearchResultProps } from "../../extensions/isSearchIndexExtension";
import {
  createSearchDB,
  insertEntry,
  queryIndex,
  type SearchDB,
  type GroupedResults,
  type SearchEntry,
} from "./searchIndex";

interface SearchContextValue {
  query: (term: string) => Promise<GroupedResults>;
}

const SearchContext = createContext<SearchContextValue | null>(null);

const MOCK_CLUSTERS: Omit<SearchEntry, "category" | "icon">[] = [
  { id: "cl-1", title: "prod-east-1", description: "Production cluster in US East", pathname: "/clusters/prod-east-1", status: "healthy", meta: "4.20.5 Production aws us-east-1" },
  { id: "cl-2", title: "prod-west-2", description: "Production cluster in US West", pathname: "/clusters/prod-west-2", status: "degraded", meta: "4.17.12 Production aws us-west-2" },
  { id: "cl-3", title: "prod-eu-1", description: "Production cluster in EU Frankfurt", pathname: "/clusters/prod-eu-1", status: "healthy", meta: "4.20.5 Production on-prem eu-central" },
  { id: "cl-4", title: "dev-central-1", description: "Development cluster", pathname: "/clusters/dev-central-1", status: "healthy", meta: "4.20.5 Development on-prem us-central" },
  { id: "cl-5", title: "dev-sandbox", description: "Development sandbox cluster", pathname: "/clusters/dev-sandbox", status: "healthy", meta: "4.14.38 Development on-prem us-east-1" },
  { id: "cl-6", title: "edge-retail-nyc", description: "Edge cluster at NYC retail location", pathname: "/clusters/edge-retail-nyc", status: "healthy", meta: "4.17.12 Edge on-prem nyc" },
  { id: "cl-7", title: "edge-retail-chi", description: "Edge cluster at Chicago retail", pathname: "/clusters/edge-retail-chi", status: "critical", meta: "4.14.38 Edge on-prem chicago" },
  { id: "cl-8", title: "infra-hub", description: "Infrastructure hub cluster", pathname: "/clusters/infra-hub", status: "healthy", meta: "4.20.5 Infrastructure on-prem us-central" },
];

const SETTINGS: Omit<SearchEntry, "category" | "icon">[] = [
  { id: "set-dark", title: "Toggle dark mode", description: "Switch between light and dark theme", pathname: "#toggle-dark", status: "", meta: "theme appearance" },
  { id: "set-glass", title: "Toggle glass theme", description: "Enable or disable glass morphism", pathname: "#toggle-glass", status: "", meta: "theme appearance" },
  { id: "set-debug", title: "Debug console", description: "Open the debug page with plugin and config info", pathname: "/debug", status: "", meta: "developer debug" },
];

export function SearchProvider({ children }: { children: ReactNode }) {
  const { pluginPages } = useAppConfig();
  const [searchExtensions, extensionsLoaded] = useResolvedExtensions(isSearchIndexExtension);
  const dbRef = useRef<SearchDB | null>(null);
  const componentMapRef = useRef(new Map<string, React.ComponentType<SearchResultProps>>());
  const populatedRef = useRef(false);
  const extensionsInsertedRef = useRef(false);

  useEffect(() => {
    if (populatedRef.current) return;
    populatedRef.current = true;

    const db = createSearchDB();
    dbRef.current = db;

    for (const page of pluginPages) {
      insertEntry(db, {
        id: `nav-${page.id}`,
        title: page.title,
        description: `Navigate to ${page.title}`,
        category: "nav",
        pathname: `/${page.path}`,
        icon: "CubesIcon",
        status: "",
        meta: page.path,
      });
    }

    for (const cluster of MOCK_CLUSTERS) {
      insertEntry(db, { ...cluster, category: "cluster", icon: "ServerIcon" });
    }

    for (const setting of SETTINGS) {
      insertEntry(db, { ...setting, category: "setting", icon: "CogIcon" });
    }
  }, [pluginPages]);

  useEffect(() => {
    if (!extensionsLoaded || extensionsInsertedRef.current || !dbRef.current) return;
    extensionsInsertedRef.current = true;

    for (const ext of searchExtensions) {
      const { id, title, description, category, meta, component } = ext.properties;
      const entryId = `ext-${id}`;
      insertEntry(dbRef.current, {
        id: entryId,
        title,
        description,
        category,
        pathname: "",
        icon: "",
        status: "",
        meta: meta ?? "",
      });
      componentMapRef.current.set(entryId, component);
    }
  }, [extensionsLoaded, searchExtensions]);

  const query = useCallback(async (term: string): Promise<GroupedResults> => {
    if (!dbRef.current) return {};
    const results = await queryIndex(dbRef.current, term);
    for (const items of Object.values(results)) {
      for (const item of items) {
        const comp = componentMapRef.current.get(item.id);
        if (comp) item.Component = comp;
      }
    }
    return results;
  }, []);

  return (
    <SearchContext.Provider value={{ query }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch must be used within a SearchProvider");
  return ctx;
}
