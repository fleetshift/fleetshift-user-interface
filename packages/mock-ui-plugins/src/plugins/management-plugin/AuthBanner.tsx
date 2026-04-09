import { Alert, Button } from "@patternfly/react-core";
import { Link } from "react-router-dom";
import { useAuthState } from "./authState";

/**
 * Shows an inline warning if auth hasn't been configured yet.
 * Renders nothing if auth is already set up. Reactive — updates
 * automatically when auth state changes via the shared store.
 */
export default function AuthBanner() {
  const { isConfigured } = useAuthState();

  if (isConfigured) return null;

  return (
    <Alert
      variant="warning"
      title="Authentication not configured"
      isInline
      style={{ marginBottom: "var(--pf-t--global--spacer--md)" }}
      actionLinks={
        <Link to="/auth-methods">
          <Button variant="link" isInline>
            Configure auth method
          </Button>
        </Link>
      }
    >
      Register an OIDC auth method to enable token validation on the
      management plane.
    </Alert>
  );
}
