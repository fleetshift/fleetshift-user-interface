import { createServer, IncomingMessage, ServerResponse } from "http";
import { execSync } from "child_process";
import open from "open";
import { generateCodeVerifier, generateCodeChallenge } from "./pkce.js";
import { saveTokens, StoredTokens } from "./tokenStore.js";

const DEFAULT_KEYCLOAK_URL = "http://localhost:8180";
const REDIRECT_PORT = 8888;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`;
const CLIENT_ID = "fleetshift-cli";

function killPortHolder(port: number): void {
  try {
    const pid = execSync(`lsof -ti :${port}`, { encoding: "utf-8" }).trim();
    if (pid) {
      execSync(`kill -9 ${pid}`);
    }
  } catch {
    // No process on that port, or kill failed — either way, proceed
  }
}

export async function performLogin(
  keycloakUrl: string = DEFAULT_KEYCLOAK_URL,
): Promise<StoredTokens> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const authUrl = new URL(
    `${keycloakUrl}/realms/fleetshift/protocol/openid-connect/auth`,
  );
  authUrl.searchParams.set("client_id", CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("scope", "openid profile email roles");

  return new Promise<StoredTokens>((resolve, reject) => {
    let settled = false;
    let timeout: ReturnType<typeof setTimeout>;

    const server = createServer(
      async (req: IncomingMessage, res: ServerResponse) => {
        const url = new URL(
          req.url ?? "/",
          `http://localhost:${REDIRECT_PORT}`,
        );

        if (url.pathname !== "/callback") {
          res.writeHead(404);
          res.end("Not found");
          return;
        }

        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");

        if (error || !code) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(
            "<html><body><h2>Login failed</h2><p>You can close this window.</p></body></html>",
          );
          cleanup();
          if (!settled) {
            settled = true;
            reject(new Error(error ?? "No authorization code received"));
          }
          return;
        }

        try {
          const tokens = await exchangeCode(code, codeVerifier, keycloakUrl);
          saveTokens(tokens);

          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(
            "<html><body><h2>Login successful!</h2><p>You can close this window and return to the terminal.</p></body></html>",
          );
          cleanup();
          if (!settled) {
            settled = true;
            resolve(tokens);
          }
        } catch (err) {
          res.writeHead(500, { "Content-Type": "text/html" });
          res.end(
            "<html><body><h2>Token exchange failed</h2><p>You can close this window.</p></body></html>",
          );
          cleanup();
          if (!settled) {
            settled = true;
            reject(err);
          }
        }
      },
    );

    function cleanup() {
      clearTimeout(timeout);
      server.close();
    }

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        // Kill the stale process and retry once
        killPortHolder(REDIRECT_PORT);
        server.listen(REDIRECT_PORT, () => {
          open(authUrl.toString());
        });
      } else if (!settled) {
        settled = true;
        reject(err);
      }
    });

    server.listen(REDIRECT_PORT, () => {
      open(authUrl.toString());
    });

    // Timeout after 2 minutes
    timeout = setTimeout(() => {
      server.close();
      if (!settled) {
        settled = true;
        reject(
          new Error("Login timed out — no callback received within 2 minutes"),
        );
      }
    }, 120_000);
  });
}

async function exchangeCode(
  code: string,
  codeVerifier: string,
  keycloakUrl: string,
): Promise<StoredTokens> {
  const tokenUrl = `${keycloakUrl}/realms/fleetshift/protocol/openid-connect/token`;

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: CLIENT_ID,
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: codeVerifier,
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    keycloak_url: keycloakUrl,
  };
}
