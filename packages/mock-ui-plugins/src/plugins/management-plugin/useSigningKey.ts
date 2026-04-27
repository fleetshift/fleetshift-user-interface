import { useCallback, useEffect, useState } from "react";
import {
  getSigningKeyStatus,
  signDeployment as signDeploy,
} from "./signingKeyApi";

/**
 * Lightweight hook for components that just need to know whether a
 * signing key exists and to sign payloads (e.g. DeploymentsPage).
 *
 * For the full enrollment wizard, use `useSigningKeyStore` from
 * `signingKeyStore.ts` instead.
 */
export function useSigningKey() {
  const [enrolled, setEnrolled] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSigningKeyStatus().then((s) => {
      if (!cancelled) {
        setEnrolled(s.enrolled);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const sign = useCallback(
    (envelopeBytes: Uint8Array): Promise<string> => signDeploy(envelopeBytes),
    [],
  );

  return { loaded, enrolled, signDeployment: sign };
}
