import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import {
  AuthProvider as OidcAuthProvider,
  useAuth as useOidcAuth,
} from "react-oidc-context";
import { oidcConfig } from "../auth/oidcConfig";
import {
  setAccessToken,
  setOnUnauthorized,
  installFetchInterceptor,
} from "../auth/fetchInterceptor";

// Install the fetch interceptor once at module load
installFetchInterceptor();

export interface User {
  id: string;
  username: string;
  display_name: string;
  role: string;
  navLayout: Array<{ path: string; label: string }>;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  token: string | undefined;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface OidcProfile {
  preferred_username?: string;
  realm_access?: { roles?: string[] };
}

function KeycloakAuthInner({ children }: { children: ReactNode }) {
  const oidc = useOidcAuth();
  const oidcRef = useRef(oidc);
  oidcRef.current = oidc;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchedForToken = useRef<string | undefined>(undefined);

  const accessToken = oidc.user?.access_token;

  // Keep the fetch interceptor token in sync
  useEffect(() => {
    setAccessToken(accessToken);
  }, [accessToken]);

  useEffect(() => {
    if (oidc.isLoading) return;

    if (!oidc.isAuthenticated || !accessToken) {
      setLoading(false);
      return;
    }

    // Prevent re-fetching for the same token
    if (fetchedForToken.current === accessToken) return;
    fetchedForToken.current = accessToken;

    // Ensure the interceptor has the token before we fetch
    setAccessToken(accessToken);

    const profile = oidc.user!.profile as OidcProfile;
    const username = profile.preferred_username ?? "unknown";
    const roles = profile.realm_access?.roles ?? [];
    const role = roles.includes("ops") ? "ops" : "dev";

    // Call the server login endpoint to auto-create user and get full data
    fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((serverUser) => {
        if (serverUser) {
          setUser(serverUser);
        } else {
          setUser({
            id: `user-${username}`,
            username,
            display_name: username.charAt(0).toUpperCase() + username.slice(1),
            role,
            navLayout: [],
          });
        }
        setLoading(false);
      })
      .catch(() => {
        setUser({
          id: `user-${username}`,
          username,
          display_name: username.charAt(0).toUpperCase() + username.slice(1),
          role,
          navLayout: [],
        });
        setLoading(false);
      });
  }, [oidc.isLoading, oidc.isAuthenticated, accessToken]);

  // On 401 from any API call, redirect to Keycloak login
  useEffect(() => {
    setOnUnauthorized(() => {
      oidcRef.current.signinRedirect();
    });
  }, []);

  const login = useCallback(() => {
    oidcRef.current.signinRedirect();
  }, []);

  const logout = useCallback(() => {
    oidcRef.current.signoutRedirect();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        token: accessToken,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <OidcAuthProvider {...oidcConfig}>
      <KeycloakAuthInner>{children}</KeycloakAuthInner>
    </OidcAuthProvider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
