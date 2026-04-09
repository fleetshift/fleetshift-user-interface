/**
 * Shared auth method state for management plugin pages.
 * Uses Scalprum's createSharedStore so all management plugin
 * modules share the same reactive state. Also persists to
 * localStorage so it survives page refreshes.
 */

import { createSharedStore } from "@scalprum/core";
import { useGetState } from "@scalprum/react-core";

const STORAGE_KEY = "fleetshift:auth-method";

export interface StoredAuthMethod {
  name: string;
  issuerUrl: string;
  audience: string;
  configuredAt: string;
}

interface AuthStoreState {
  method: StoredAuthMethod | null;
}

const EVENTS = ["SET", "CLEAR"] as const;

type AuthStore = ReturnType<
  typeof createSharedStore<AuthStoreState, typeof EVENTS>
>;

function loadFromStorage(): StoredAuthMethod | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

let store: AuthStore | null = null;

function getStore(): AuthStore {
  if (!store) {
    store = createSharedStore<AuthStoreState, typeof EVENTS>({
      initialState: { method: loadFromStorage() },
      events: EVENTS,
      onEventChange: (state, event, payload) => {
        switch (event) {
          case "SET": {
            const method = payload as StoredAuthMethod;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(method));
            return { method };
          }
          case "CLEAR":
            localStorage.removeItem(STORAGE_KEY);
            return { method: null };
          default:
            return state;
        }
      },
    });
  }
  return store;
}

export function setStoredAuthMethod(method: StoredAuthMethod): void {
  getStore().updateState("SET", method);
}

export function clearStoredAuthMethod(): void {
  getStore().updateState("CLEAR", undefined);
}

export function getStoredAuthMethod(): StoredAuthMethod | null {
  return getStore().getState().method;
}

export function isAuthConfigured(): boolean {
  return getStore().getState().method !== null;
}

/**
 * React hook — re-renders when auth state changes.
 */
export function useAuthState(): {
  method: StoredAuthMethod | null;
  isConfigured: boolean;
} {
  const state = useGetState(getStore());
  return {
    method: state.method,
    isConfigured: state.method !== null,
  };
}
