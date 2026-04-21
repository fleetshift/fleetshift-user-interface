import { createSharedStore } from "@scalprum/core";
import { useGetState } from "@scalprum/react-core";
import { useCallback, useEffect } from "react";
import {
  generateSigningKey as generateKey,
  getSigningKeyStatus,
  removeSigningKey as removeKey,
  exportPublicKeyDER,
  getStoredPublicKey,
} from "./signingKeyApi";
import { createSignerEnrollment, deleteSignerEnrollment } from "./api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Registry = "oidc" | "github.com" | "manual";
export type Step =
  | "loading"
  | "empty"
  | "generating"
  | "pick-registry"
  | "enrolling"
  | "enrolled"
  | "removing";

export interface SigningKeyStoreState {
  step: Step;
  sshPublicKey: string | null;
  selectedRegistry: Registry;
  error: string | null;
  success: string | null;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

const EVENTS = [
  "INIT_EMPTY",
  "INIT_ENROLLED",
  "GENERATE_START",
  "GENERATE_OK",
  "SELECT_REGISTRY",
  "ENROLL_START",
  "ENROLL_OK",
  "REMOVE_START",
  "REMOVE_OK",
  "ERROR",
  "DISMISS_ERROR",
  "DISMISS_SUCCESS",
] as const;

type SigningKeyStore = ReturnType<
  typeof createSharedStore<SigningKeyStoreState, typeof EVENTS>
>;

// ---------------------------------------------------------------------------
// Singleton store
// ---------------------------------------------------------------------------

const INITIAL: SigningKeyStoreState = {
  step: "loading",
  sshPublicKey: null,
  selectedRegistry: "oidc",
  error: null,
  success: null,
};

let store: SigningKeyStore | null = null;

function getStore(): SigningKeyStore {
  if (!store) {
    store = createSharedStore<SigningKeyStoreState, typeof EVENTS>({
      initialState: INITIAL,
      events: EVENTS,
      onEventChange: (state, event, payload) => {
        switch (event) {
          case "INIT_EMPTY":
            return { ...state, step: "empty" as const };
          case "INIT_ENROLLED":
            return {
              ...state,
              step: "enrolled" as const,
              sshPublicKey: payload as string,
            };
          case "GENERATE_START":
            return {
              ...state,
              step: "generating" as const,
              error: null,
              success: null,
            };
          case "GENERATE_OK":
            return {
              ...state,
              step: "pick-registry" as const,
              sshPublicKey: payload as string,
            };
          case "SELECT_REGISTRY":
            return { ...state, selectedRegistry: payload as Registry };
          case "ENROLL_START":
            return { ...state, step: "enrolling" as const, error: null };
          case "ENROLL_OK":
            return {
              ...state,
              step: "enrolled" as const,
              success: payload as string,
            };
          case "REMOVE_START":
            return {
              ...state,
              step: "removing" as const,
              error: null,
              success: null,
            };
          case "REMOVE_OK":
            return {
              ...INITIAL,
              step: "empty" as const,
              success: "Signing key removed.",
            };
          case "ERROR":
            return {
              ...state,
              step: state.sshPublicKey
                ? ("pick-registry" as const)
                : ("empty" as const),
              error: payload as string,
            };
          case "DISMISS_ERROR":
            return { ...state, error: null };
          case "DISMISS_SUCCESS":
            return { ...state, success: null };
          default:
            return state;
        }
      },
    });
  }
  return store;
}

// ---------------------------------------------------------------------------
// OIDC helpers (Keycloak Account API for the POC)
// ---------------------------------------------------------------------------

const KC_AUTHORITY = "http://keycloak:8180/auth/realms/fleetshift";
const KC_CLIENT_ID = "fleetshift-ui";

function getAccessToken(): string | null {
  const key = `oidc.user:${KC_AUTHORITY}:${KC_CLIENT_ID}`;
  const raw = sessionStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw).access_token ?? null;
  } catch {
    return null;
  }
}

/**
 * Refresh the OIDC session to get a fresh ID token that includes
 * any recently-updated user attributes (e.g. signing_public_key).
 * Returns the new ID token, or null if refresh fails.
 */
async function refreshAndGetIdToken(): Promise<string | null> {
  const key = `oidc.user:${KC_AUTHORITY}:${KC_CLIENT_ID}`;
  const raw = sessionStorage.getItem(key);
  if (!raw) return null;

  let session: Record<string, unknown>;
  try {
    session = JSON.parse(raw);
  } catch {
    return null;
  }

  const refreshToken = session.refresh_token as string | undefined;
  if (!refreshToken) return null;

  const tokenUrl = `${KC_AUTHORITY}/protocol/openid-connect/token`;
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: KC_CLIENT_ID,
    refresh_token: refreshToken,
  });

  const resp = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!resp.ok) return null;

  const tokens = await resp.json();
  // Update stored session with fresh tokens
  const updated = {
    ...session,
    access_token: tokens.access_token,
    id_token: tokens.id_token,
    refresh_token: tokens.refresh_token ?? refreshToken,
  };
  sessionStorage.setItem(key, JSON.stringify(updated));

  return (tokens.id_token as string) ?? null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Shared signing-key store hook.
 *
 * On first use: checks IndexedDB for an existing key.
 * Returns the current wizard state + action callbacks.
 *
 * Other plugins can consume this via `useRemoteHook`:
 *   scope: "management-plugin", module: "useSigningKeyStore"
 */
export function useSigningKeyStore() {
  const s = getStore();
  const state = useGetState(s);

  // Check IndexedDB on first mount
  useEffect(() => {
    if (state.step !== "loading") return;
    getSigningKeyStatus().then((status) => {
      if (status.enrolled && status.sshPublicKey) {
        s.updateState("INIT_ENROLLED", status.sshPublicKey);
      } else {
        s.updateState("INIT_EMPTY", null);
      }
    });
  }, [s, state.step]);

  const generate = useCallback(async () => {
    s.updateState("GENERATE_START", null);
    try {
      const sshPub = await generateKey();
      s.updateState("GENERATE_OK", sshPub);
    } catch (err) {
      s.updateState(
        "ERROR",
        err instanceof Error ? err.message : "Failed to generate key.",
      );
    }
  }, [s]);

  const selectRegistry = useCallback(
    (registry: Registry) => {
      s.updateState("SELECT_REGISTRY", registry);
    },
    [s],
  );

  const enroll = useCallback(async () => {
    s.updateState("ENROLL_START", null);
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error("No OIDC session found. Log in first.");
      }

      const currentState = s.getState();

      let enrollmentToken = token;

      // OIDC (e.g. Keycloak): store public key as user attribute,
      // then refresh the session to get a fresh ID token that
      // includes the signing_public_key claim.
      if (currentState.selectedRegistry === "oidc") {
        const pub = await getStoredPublicKey();
        if (!pub) throw new Error("No signing key in IndexedDB");
        const derB64 = await exportPublicKeyDER(pub);
        const headers = {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        };
        const profileResp = await fetch(`${KC_AUTHORITY}/account`, {
          headers,
        });
        if (!profileResp.ok) {
          throw new Error(
            `IdP GET profile returned ${profileResp.status}: ${await profileResp.text()}`,
          );
        }
        const profile = await profileResp.json();
        profile.attributes = {
          ...profile.attributes,
          signing_public_key: [derB64],
        };
        const resp = await fetch(`${KC_AUTHORITY}/account`, {
          method: "POST",
          headers,
          body: JSON.stringify(profile),
        });
        if (!resp.ok) {
          throw new Error(
            `IdP returned ${resp.status}: ${await resp.text()}`,
          );
        }

        // Refresh to get a new ID token with the signing_public_key claim
        const freshIdToken = await refreshAndGetIdToken();
        if (!freshIdToken) {
          throw new Error(
            "Failed to refresh session after storing public key. Try logging out and back in.",
          );
        }
        enrollmentToken = freshIdToken;
      } else if (currentState.selectedRegistry === "github.com") {
        // GitHub: copy SSH key to clipboard + open settings page
        if (currentState.sshPublicKey) {
          await navigator.clipboard.writeText(currentState.sshPublicKey);
        }
        window.open("https://github.com/settings/ssh/new", "_blank");
      }

      // Registry ID selects which admin-configured CEL mapping to use.
      // The subject is derived server-side — no client overrides.
      await createSignerEnrollment({
        signerEnrollmentId: `browser-${Date.now()}`,
        identityToken: enrollmentToken,
        registryId:
          currentState.selectedRegistry === "manual"
            ? undefined
            : currentState.selectedRegistry,
      });

      const messages: Record<Registry, string> = {
        oidc: "Public key stored in IdP and enrollment registered. You can now sign deployments.",
        "github.com":
          "SSH public key copied. Paste it in GitHub SSH keys (as a Signing Key). Enrollment registered.",
        manual:
          "Copy the SSH public key and add it to your key registry. Enrollment registered.",
      };
      s.updateState("ENROLL_OK", messages[currentState.selectedRegistry]);
    } catch (err) {
      s.updateState(
        "ERROR",
        err instanceof Error ? err.message : "Failed to enroll.",
      );
    }
  }, [s]);

  const remove = useCallback(async () => {
    s.updateState("REMOVE_START", null);
    try {
      await removeKey();
      // Best-effort delete of server-side enrollment — ignore errors
      // (e.g. user may not be logged in or enrollment may not exist).
      deleteSignerEnrollment().catch(() => {});
      s.updateState("REMOVE_OK", null);
    } catch (err) {
      s.updateState(
        "ERROR",
        err instanceof Error ? err.message : "Failed to remove key.",
      );
    }
  }, [s]);

  const dismissError = useCallback(() => {
    s.updateState("DISMISS_ERROR", null);
  }, [s]);

  const dismissSuccess = useCallback(() => {
    s.updateState("DISMISS_SUCCESS", null);
  }, [s]);

  return {
    ...state,
    // Whether a signing key exists (for other plugins to check)
    enrolled: state.step === "enrolled",
    // Actions
    generate,
    selectRegistry,
    enroll,
    remove,
    dismissError,
    dismissSuccess,
  };
}

export default useSigningKeyStore;
