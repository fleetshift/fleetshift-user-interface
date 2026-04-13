import type { AuthProviderProps } from "react-oidc-context";

// Keycloak is accessed directly (keycloak resolves to 127.0.0.1 via /etc/hosts).
// HTTP avoids TLS cert issues; SameSite cookies work because keycloak→127.0.0.1
// is treated as same-site by browsers (both resolve to localhost).
export const oidcConfig: AuthProviderProps = {
  authority: "http://keycloak:8180/auth/realms/fleetshift",
  client_id: "fleetshift-ui",
  redirect_uri: window.location.origin + "/",
  post_logout_redirect_uri: window.location.origin + "/",
  scope: "openid profile email roles",
  automaticSilentRenew: true,
  onSigninCallback: () => {
    // Remove OIDC query params from URL after login
    window.history.replaceState({}, document.title, window.location.pathname);
  },
};
