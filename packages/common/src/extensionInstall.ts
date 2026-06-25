import { createIDBStore } from "./idb/createIDBStore.js";
import type { NavLayoutOverride } from "./navLayout.js";
import { isNavLayoutOverride } from "./navLayout.js";

export interface CoreExtensionMeta {
  navSection: "main" | "bottom";
  learnMoreUrl?: string;
}

export const CORE_EXTENSION_DEFAULTS: Record<string, boolean> = {
  "overview-plugin": true,
  "core-plugin": true,
  "management-plugin": true,
  "signing-plugin": true,
  "gcphcp-plugin": true,
  "kind-plugin": true,
  "configuration-plugin": false,
  "virtualization-plugin": false,
  "security-plugin": false,
  "observability-plugin": false,
  "settings-plugin": true,
};

export const CORE_EXTENSION_META: Record<string, CoreExtensionMeta> = {
  "overview-plugin": { navSection: "main" },
  "core-plugin": { navSection: "main" },
  "management-plugin": { navSection: "main" },
  "signing-plugin": { navSection: "bottom" },
  "gcphcp-plugin": { navSection: "main" },
  "kind-plugin": { navSection: "main" },
  "configuration-plugin": { navSection: "main" },
  "virtualization-plugin": { navSection: "main" },
  "security-plugin": { navSection: "main" },
  "observability-plugin": { navSection: "main" },
  "settings-plugin": { navSection: "bottom" },
};

// --- IndexedDB stores via createIDBStore ---

const EXTENSION_DB_NAME = "ome-extensions";
const EXTENSION_DB_VERSION = 3;

function upgradeExtensionDb(db: IDBDatabase, oldVersion: number) {
  if (oldVersion < 1) db.createObjectStore("install-state");
  if (oldVersion < 2) db.createObjectStore("nav-order");
  if (oldVersion < 3) db.createObjectStore("nav-layout");
}

const installStateStore = createIDBStore<boolean>({
  db: EXTENSION_DB_NAME,
  version: EXTENSION_DB_VERSION,
  store: "install-state",
  upgrade: upgradeExtensionDb,
  validate: (raw) => (typeof raw === "boolean" ? raw : null),
});

const navOrderStore = createIDBStore<string[]>({
  db: EXTENSION_DB_NAME,
  version: EXTENSION_DB_VERSION,
  store: "nav-order",
  upgrade: upgradeExtensionDb,
  validate: (raw) => (Array.isArray(raw) ? (raw as string[]) : null),
});

const navLayoutStore = createIDBStore<NavLayoutOverride>({
  db: EXTENSION_DB_NAME,
  version: EXTENSION_DB_VERSION,
  store: "nav-layout",
  upgrade: upgradeExtensionDb,
  validate: (raw) => (isNavLayoutOverride(raw) ? raw : null),
});

// --- Public API ---

export async function getInstallState(): Promise<Record<string, boolean>> {
  return installStateStore.getAll();
}

export async function setInstalled(
  scope: string,
  installed: boolean,
): Promise<void> {
  await installStateStore.put(scope, installed);
}

export async function initializeDefaults(): Promise<void> {
  const existing = await installStateStore.getAll();
  for (const [key, value] of Object.entries(CORE_EXTENSION_DEFAULTS)) {
    if (!(key in existing)) {
      await installStateStore.put(key, value);
    }
  }
}

export async function getNavOrder(): Promise<string[] | null> {
  return navOrderStore.get("order");
}

export async function setNavOrder(order: string[]): Promise<void> {
  await navOrderStore.put("order", order);
}

export async function getNavLayout(): Promise<NavLayoutOverride | null> {
  return navLayoutStore.get("layout");
}

export async function setNavLayout(override: NavLayoutOverride): Promise<void> {
  await navLayoutStore.put("layout", override);
}

type ExtensionStore = {
  init: typeof initializeDefaults;
  setInstalled: typeof setInstalled;
  getInstallState: typeof getInstallState;
  subscribe: (listener: (state: Record<string, boolean>) => void) => () => void;
  getNavOrder: typeof getNavOrder;
  setNavOrder: typeof setNavOrder;
  subscribeNavOrder: (listener: (order: string[] | null) => void) => () => void;
  getNavLayout: typeof getNavLayout;
  setNavLayout: typeof setNavLayout;
  subscribeNavLayout: (
    listener: (override: NavLayoutOverride | null) => void,
  ) => () => void;
};

let extensionStore: ExtensionStore;

export function getExtensionStore(): ExtensionStore {
  if (!extensionStore) {
    const subs = new Set<(state: Record<string, boolean>) => void>();
    const navSubs = new Set<(order: string[] | null) => void>();
    const layoutSubs = new Set<(override: NavLayoutOverride | null) => void>();

    async function notifyInstall() {
      const state = await getInstallState();
      for (const cb of subs) {
        cb(state);
      }
    }

    async function notifyNavOrder() {
      const order = await getNavOrder();
      for (const cb of navSubs) {
        cb(order);
      }
    }

    async function notifyNavLayout() {
      const layout = await getNavLayout();
      for (const cb of layoutSubs) {
        cb(layout);
      }
    }

    extensionStore = {
      init: async () => {
        await initializeDefaults();
        await notifyInstall();
      },
      setInstalled: async (scope, installed) => {
        await setInstalled(scope, installed);
        await notifyInstall();
      },
      getInstallState,
      subscribe(cb) {
        subs.add(cb);
        return () => {
          subs.delete(cb);
        };
      },
      getNavOrder,
      setNavOrder: async (order) => {
        await setNavOrder(order);
        await notifyNavOrder();
      },
      subscribeNavOrder(cb) {
        navSubs.add(cb);
        return () => {
          navSubs.delete(cb);
        };
      },
      getNavLayout,
      setNavLayout: async (override) => {
        await setNavLayout(override);
        await notifyNavLayout();
      },
      subscribeNavLayout(cb) {
        layoutSubs.add(cb);
        return () => {
          layoutSubs.delete(cb);
        };
      },
    };
  }

  return extensionStore;
}
