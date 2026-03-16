let _token: string | undefined;
let _onUnauthorized: (() => void) | undefined;

const _originalFetch = window.fetch;

const API_ORIGIN = "http://localhost:4000";

/** Endpoints where a 401 means the session is truly expired and we must re-login. */
const AUTH_ENDPOINTS = ["/api/v1/auth/", "/api/v1/users/"];

export function setAccessToken(token: string | undefined) {
  _token = token;
}

export function setOnUnauthorized(handler: () => void) {
  _onUnauthorized = handler;
}

/**
 * Monkey-patches `window.fetch` to inject the Authorization header
 * on requests to the app origin (proxied API) or the API server directly.
 * On 401 responses, triggers a re-login redirect.
 */
export function installFetchInterceptor() {
  window.fetch = function patchedFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    if (!_token) {
      return _originalFetch(input, init);
    }

    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    const isApiRequest =
      url.startsWith("/") ||
      url.startsWith(window.location.origin) ||
      url.startsWith(API_ORIGIN);

    if (!isApiRequest) {
      return _originalFetch(input, init);
    }

    const headers = new Headers(init?.headers);
    if (!headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${_token}`);
    }

    return _originalFetch(input, { ...init, headers }).then((response) => {
      if (response.status === 401 && _onUnauthorized) {
        const pathname = new URL(url, window.location.origin).pathname;
        const isAuthEndpoint = AUTH_ENDPOINTS.some((prefix) =>
          pathname.startsWith(prefix),
        );
        if (isAuthEndpoint) {
          _onUnauthorized();
        }
      }
      return response;
    });
  };
}
