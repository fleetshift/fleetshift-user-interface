/**
 * Base URL for the resource search API.
 * Matches the OpenAPI spec: `/apis/fleetshift.io/v1/{scope}:searchResources`
 */
const SEARCH_BASE = "/apis/fleetshift.io/v1";

// ---------------------------------------------------------------------------
// Response / result types (from OpenAPI spec: fleetshift/v1/manifest.proto)
// ---------------------------------------------------------------------------

/** Health or progress condition reported by a delivery agent. */
export interface Condition {
  type: string;
  status: string;
  reason: string;
  message: string;
  lastTransitionTime: string;
}

/**
 * A single resource returned by SearchResources.
 *
 * The generic `Props` parameter types the `properties` bag so
 * callers can access addon-defined fields without casting.
 */
export interface ResourceSearchResult<Props = Record<string, unknown>> {
  /** Full resource name, e.g. `"//kind.fleetshift.io/clusters/prod"`. */
  name: string;
  /** Relative platform resource name, e.g. `"clusters/prod"`. */
  platformResource: string;
  /** Owning extension service, e.g. `"kind.fleetshift.io"`. */
  service: string;
  /** Collection within the service, e.g. `"clusters"`. */
  collection: string;
  /** Effective labels (platform + extension). */
  labels: Record<string, string>;
  /** Latest reported conditions. */
  conditions: Condition[];
  /** Stable, addon-defined properties. */
  properties: Props;
  /** Latest observation payload (opaque). */
  observations: Record<string, unknown>;
  createTime: string;
  updateTime: string;
}

/** Paginated response from SearchResources. */
export interface SearchResourcesResponse<Props = Record<string, unknown>> {
  results: ResourceSearchResult<Props>[];
  /** Empty string when there are no more pages. */
  nextPageToken: string;
}

// ---------------------------------------------------------------------------
// Request parameters
// ---------------------------------------------------------------------------

/** Parameters accepted by {@link ResourceApi.search}. */
export interface SearchResourcesParams {
  /** CEL filter expression. Empty matches everything. */
  filter?: string;
  /** Max results per page (server default 50, max 1000). */
  pageSize?: number;
  /** Token from a previous response to fetch the next page. */
  pageToken?: string;
}

// ---------------------------------------------------------------------------
// API error
// ---------------------------------------------------------------------------

/** Structured error body returned by the gRPC-gateway. */
export interface RpcStatus {
  code: number;
  message: string;
  details?: unknown[];
}

/** Error thrown when the search API returns a non-OK response. */
export class ResourceApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly rpcStatus: RpcStatus | null,
  ) {
    super(rpcStatus?.message ?? `Search API error ${status}`);
    this.name = "ResourceApiError";
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildSearchUrl(scope: string, params?: SearchResourcesParams): string {
  const qp = new URLSearchParams();
  if (params?.filter) qp.set("filter", params.filter);
  if (params?.pageSize != null) qp.set("pageSize", String(params.pageSize));
  if (params?.pageToken) qp.set("pageToken", params.pageToken);
  const qs = qp.toString();
  const path = `${SEARCH_BASE}/${encodeURIComponent(scope)}:searchResources`;
  return qs ? `${path}?${qs}` : path;
}

/** Escape a value for embedding in a CEL string literal (backslash + double-quote). */
function escapeCelString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function searchRequest<Props>(
  scope: string,
  params?: SearchResourcesParams,
): Promise<SearchResourcesResponse<Props>> {
  const url = buildSearchUrl(scope, params);
  const res = await fetch(url);
  if (!res.ok) {
    const rpcStatus = (await res.json().catch(() => null)) as RpcStatus | null;
    throw new ResourceApiError(res.status, rpcStatus);
  }
  return res.json() as Promise<SearchResourcesResponse<Props>>;
}

// ---------------------------------------------------------------------------
// Public API object
// ---------------------------------------------------------------------------

/** Typed client returned by {@link createResourceApi}. */
export interface ResourceApi<Props = Record<string, unknown>> {
  /**
   * Search resources with an optional CEL filter and pagination.
   * Maps directly to `SearchService.SearchResources`.
   */
  search(
    params?: SearchResourcesParams,
  ): Promise<SearchResourcesResponse<Props>>;

  /**
   * List all resources (no filter). Convenience wrapper around
   * {@link search} with only pagination parameters.
   */
  list(
    params?: Pick<SearchResourcesParams, "pageSize" | "pageToken">,
  ): Promise<SearchResourcesResponse<Props>>;

  /**
   * Fetch a single resource by its full resource name.
   *
   * Uses a CEL filter `name == "{resourceName}"` under the hood.
   * Returns `undefined` when no match is found.
   */
  get(resourceName: string): Promise<ResourceSearchResult<Props> | undefined>;

  /**
   * Fetch all pages of results and return a flat array.
   * Automatically follows `nextPageToken` until exhausted.
   */
  searchAll(
    params?: Omit<SearchResourcesParams, "pageToken">,
  ): Promise<ResourceSearchResult<Props>[]>;
}

/**
 * Create a typed resource-search API client scoped to a resource
 * hierarchy location.
 *
 * @example
 * ```ts
 * interface ClusterProps { apiUrl: string; version: string }
 * const clusterApi = createResourceApi<ClusterProps>("-");
 *
 * // search with a CEL filter
 * const { results } = await clusterApi.search({
 *   filter: 'collection == "clusters"',
 *   pageSize: 20,
 * });
 *
 * // auto-paginate
 * for await (const page of clusterApi.searchAll()) {
 *   console.log(page);
 * }
 * ```
 *
 * @param scope - Scope to search within (use `"-"` for global).
 */
// ---------------------------------------------------------------------------
// Generic REST API client
// ---------------------------------------------------------------------------

/**
 * Generic REST client for non-search API calls (CRUD operations).
 *
 * Replaces per-plugin `makeRequest` / `mgmtFetch` wrappers with a shared,
 * typed client that uses the same structured {@link ResourceApiError} error
 * handling as the search client.
 */
export interface ApiClient {
  /** GET `basePath + path` with optional query params. */
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  /** POST `basePath + path` with optional JSON body. */
  post<T>(path: string, body?: unknown): Promise<T>;
  /** PUT `basePath + path` with optional JSON body. */
  put<T>(path: string, body?: unknown): Promise<T>;
  /** PATCH `basePath + path` with optional JSON body. */
  patch<T>(path: string, body?: unknown): Promise<T>;
  /** DELETE `basePath + path`. */
  delete<T>(path: string): Promise<T>;
}

async function apiRequest<T>(
  basePath: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${basePath}${path}`, init);
  if (!res.ok) {
    const rpcStatus = (await res.json().catch(() => null)) as RpcStatus | null;
    throw new ResourceApiError(res.status, rpcStatus);
  }
  return res.json() as Promise<T>;
}

function jsonInit(method: string, body?: unknown): RequestInit {
  if (body == null) return { method };
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

/**
 * Create a generic REST client scoped to `basePath`.
 *
 * @example
 * ```ts
 * const mgmt = createApiClient("/v1");
 * const deployments = await mgmt.get<ListDeploymentsResponse>("/deployments");
 *
 * const gcphcp = createApiClient("/apis/gcphcp.fleetshift.io/v1");
 * const cluster = await gcphcp.post<GcpHcpCluster>(
 *   "/clusters?cluster_id=my-cluster",
 *   { spec },
 * );
 * ```
 */
export function createApiClient(basePath: string): ApiClient {
  return {
    get<T>(path: string, params?: Record<string, string>): Promise<T> {
      const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
      return apiRequest<T>(basePath, `${path}${qs}`);
    },
    post<T>(path: string, body?: unknown): Promise<T> {
      return apiRequest<T>(basePath, path, jsonInit("POST", body));
    },
    put<T>(path: string, body?: unknown): Promise<T> {
      return apiRequest<T>(basePath, path, jsonInit("PUT", body));
    },
    patch<T>(path: string, body?: unknown): Promise<T> {
      return apiRequest<T>(basePath, path, jsonInit("PATCH", body));
    },
    delete<T>(path: string): Promise<T> {
      return apiRequest<T>(basePath, path, { method: "DELETE" });
    },
  };
}

// ---------------------------------------------------------------------------
// Resource search API client
// ---------------------------------------------------------------------------

export function createResourceApi<Props = Record<string, unknown>>(
  scope: string,
): ResourceApi<Props> {
  return {
    search(params) {
      return searchRequest<Props>(scope, params);
    },

    list(params) {
      return searchRequest<Props>(scope, params);
    },

    async get(resourceName) {
      const { results } = await searchRequest<Props>(scope, {
        filter: `name == "${escapeCelString(resourceName)}"`,
        pageSize: 1,
      });
      return results[0];
    },

    async searchAll(params) {
      const allResults: ResourceSearchResult<Props>[] = [];
      let pageToken: string | undefined;
      do {
        const response = await searchRequest<Props>(scope, {
          ...params,
          pageToken,
        });
        allResults.push(...response.results);
        pageToken = response.nextPageToken || undefined;
      } while (pageToken);
      return allResults;
    },
  };
}
