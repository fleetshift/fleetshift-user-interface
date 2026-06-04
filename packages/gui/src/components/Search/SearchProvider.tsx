import {
  createContext,
  useContext,
  useEffect,
  useRef,
  ReactNode,
  useCallback,
} from "react";
import { useResolvedExtensions } from "@openshift/dynamic-plugin-sdk";
import { useAppConfig } from "../../contexts/AppConfigContext";
import { isSearchIndexExtension } from "../../extensions/isSearchIndexExtension";
import { isSearchExtension } from "../../extensions/isSearchExtension";
import type { SearchResultProps } from "../../extensions/isSearchIndexExtension";
import {
  createSearchDB,
  insertEntry,
  queryIndex,
  type SearchDB,
  type GroupedResults,
  type SearchEntry,
  type SearchResultItem,
} from "./searchIndex";

interface SearchContextValue {
  query: (term: string) => Promise<GroupedResults>;
}

const SearchContext = createContext<SearchContextValue | null>(null);

interface FeatureInfo {
  scope: string;
  module: string;
  to?: { pathname?: string; search?: string };
}

function resolveFeaturePath(
  feature: FeatureInfo,
  pluginPages: { scope: string; module: string; path: string }[],
  extensionTo?: { pathname?: string; search?: string },
): string {
  const page = pluginPages.find(
    (p) => p.scope === feature.scope && p.module === feature.module,
  );
  const basePath = page ? `/${page.path}` : "";
  const featurePath = feature.to?.pathname ?? "";
  const extPath = extensionTo?.pathname ?? "";
  const parts = [basePath, featurePath, extPath].filter(Boolean);
  let pathname = parts.join("/").replace(/\/+/g, "/");
  if (!pathname.startsWith("/")) pathname = "/" + pathname;

  const search = extensionTo?.search ?? "";
  return search ? `${pathname}?${search}` : pathname;
}

const MOCK_CLUSTERS: Omit<SearchEntry, "category" | "icon">[] = [
  {
    id: "cl-1",
    title: "prod-east-1",
    description: "Production cluster in US East",
    pathname: "/clusters/prod-east-1",
    status: "healthy",
    meta: "4.20.5 Production aws us-east-1",
  },
  {
    id: "cl-2",
    title: "prod-west-2",
    description: "Production cluster in US West",
    pathname: "/clusters/prod-west-2",
    status: "degraded",
    meta: "4.17.12 Production aws us-west-2",
  },
  {
    id: "cl-3",
    title: "prod-eu-1",
    description: "Production cluster in EU Frankfurt",
    pathname: "/clusters/prod-eu-1",
    status: "healthy",
    meta: "4.20.5 Production on-prem eu-central",
  },
  {
    id: "cl-4",
    title: "dev-central-1",
    description: "Development cluster",
    pathname: "/clusters/dev-central-1",
    status: "healthy",
    meta: "4.20.5 Development on-prem us-central",
  },
  {
    id: "cl-5",
    title: "dev-sandbox",
    description: "Development sandbox cluster",
    pathname: "/clusters/dev-sandbox",
    status: "healthy",
    meta: "4.14.38 Development on-prem us-east-1",
  },
  {
    id: "cl-6",
    title: "edge-retail-nyc",
    description: "Edge cluster at NYC retail location",
    pathname: "/clusters/edge-retail-nyc",
    status: "healthy",
    meta: "4.17.12 Edge on-prem nyc",
  },
  {
    id: "cl-7",
    title: "edge-retail-chi",
    description: "Edge cluster at Chicago retail",
    pathname: "/clusters/edge-retail-chi",
    status: "critical",
    meta: "4.14.38 Edge on-prem chicago",
  },
  {
    id: "cl-8",
    title: "infra-hub",
    description: "Infrastructure hub cluster",
    pathname: "/clusters/infra-hub",
    status: "healthy",
    meta: "4.20.5 Infrastructure on-prem us-central",
  },
];

const SETTINGS: Omit<SearchEntry, "category" | "icon">[] = [
  {
    id: "set-dark",
    title: "Toggle dark mode",
    description: "Switch between light and dark theme",
    pathname: "#toggle-dark",
    status: "",
    meta: "theme appearance",
  },
  {
    id: "set-glass",
    title: "Toggle glass theme",
    description: "Enable or disable glass morphism",
    pathname: "#toggle-glass",
    status: "",
    meta: "theme appearance",
  },
  {
    id: "set-debug",
    title: "Debug console",
    description: "Open the debug page with plugin and config info",
    pathname: "/debug",
    status: "",
    meta: "developer debug",
  },
];

export function SearchProvider({ children }: { children: ReactNode }) {
  const { pluginPages } = useAppConfig();
  const [indexExtensions, indexLoaded] = useResolvedExtensions(
    isSearchIndexExtension,
  );
  const [featureExtensions, featureLoaded] =
    useResolvedExtensions(isSearchExtension);
  const dbRef = useRef<SearchDB | null>(null);
  const componentMapRef = useRef(
    new Map<string, React.ComponentType<SearchResultProps>>(),
  );
  const iconMapRef = useRef(new Map<string, React.ComponentType>());
  const featureParentRef = useRef(new Map<string, SearchResultItem>());
  const builtRef = useRef(false);

  useEffect(() => {
    if (!indexLoaded || !featureLoaded || builtRef.current) return;
    builtRef.current = true;

    const db = createSearchDB();
    dbRef.current = db;

    for (const page of pluginPages) {
      const navId = `nav-${page.id}`;
      const pathname = `/${page.path}`;
      insertEntry(db, {
        id: navId,
        title: page.title,
        description: `Navigate to ${page.title}`,
        category: "nav",
        pathname,
        icon: "CubesIcon",
        status: "",
        meta: page.path,
      });

      featureParentRef.current.set(page.id, {
        id: navId,
        title: page.title,
        description: `Navigate to ${page.title}`,
        category: "nav",
        pathname,
        icon: "CubesIcon",
        status: "",
      });
    }

    for (const cluster of MOCK_CLUSTERS) {
      insertEntry(db, { ...cluster, category: "cluster", icon: "ServerIcon" });
    }

    for (const setting of SETTINGS) {
      insertEntry(db, { ...setting, category: "setting", icon: "CogIcon" });
    }

    const featureRegistry = new Map<string, FeatureInfo>();

    for (const ext of indexExtensions) {
      const {
        id,
        title,
        description,
        category,
        meta,
        scope,
        module,
        to,
        component,
      } = ext.properties;
      const entryId = `ext-${id}`;

      if (scope && module) {
        featureRegistry.set(id, { scope, module, to });
      }

      const resolvedPathname =
        scope && module
          ? resolveFeaturePath({ scope, module, to }, pluginPages)
          : "";

      insertEntry(db, {
        id: entryId,
        title,
        description,
        category: category ?? "action",
        pathname: resolvedPathname,
        icon: "",
        status: "",
        meta: meta ? meta.join(" ") : "",
      });

      if (component) {
        componentMapRef.current.set(entryId, component);
      }

      if (scope && module) {
        featureParentRef.current.set(id, {
          id: entryId,
          title,
          description,
          category: category ?? "action",
          pathname: resolvedPathname,
          icon: "",
          status: "",
        });
      }
    }

    for (const ext of featureExtensions) {
      const {
        id,
        title,
        description,
        feature,
        meta,
        to,
        icon,
        iconComponent,
        component,
      } = ext.properties;
      const entryId = `ext-${id}`;

      const featureInfo = featureRegistry.get(feature);
      const parent = featureParentRef.current.get(feature);
      const extPath = to?.pathname ?? "";

      let resolvedPathname: string;
      if (featureInfo) {
        resolvedPathname = resolveFeaturePath(featureInfo, pluginPages, to);
      } else if (parent) {
        const parts = [parent.pathname, extPath].filter(Boolean);
        resolvedPathname = parts.join("/").replace(/\/+/g, "/");
      } else {
        resolvedPathname = "";
      }

      const category = parent?.category ?? "nav";

      insertEntry(db, {
        id: entryId,
        title,
        description,
        category,
        pathname: resolvedPathname,
        icon: icon ?? "",
        status: "",
        meta: meta ? meta.join(" ") : "",
        feature,
      });

      if (iconComponent) {
        iconMapRef.current.set(entryId, iconComponent);
      }
      if (component) {
        componentMapRef.current.set(entryId, component);
      }
    }
  }, [
    indexLoaded,
    featureLoaded,
    indexExtensions,
    featureExtensions,
    pluginPages,
  ]);

  const query = useCallback(async (term: string): Promise<GroupedResults> => {
    if (!dbRef.current) return {};
    const results = await queryIndex(dbRef.current, term);

    for (const items of Object.values(results)) {
      for (const item of items) {
        const comp = componentMapRef.current.get(item.id);
        if (comp) item.Component = comp;
        const icon = iconMapRef.current.get(item.id);
        if (icon) item.IconComponent = icon;
      }
    }

    for (const [cat, items] of Object.entries(results)) {
      const resultIds = new Set(items.map((i) => i.id));
      const needed = new Set<string>();
      for (const item of items) {
        if (!item.feature) continue;
        const parent = featureParentRef.current.get(item.feature);
        if (parent && !resultIds.has(parent.id)) {
          needed.add(item.feature);
        }
      }
      for (const featureId of needed) {
        const parent = featureParentRef.current.get(featureId);
        if (!parent) continue;
        const parentItem = { ...parent };
        const comp = componentMapRef.current.get(parentItem.id);
        if (comp) parentItem.Component = comp;
        results[cat] = [parentItem, ...results[cat]];
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
