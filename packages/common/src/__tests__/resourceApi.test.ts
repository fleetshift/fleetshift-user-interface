import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  ResourceSearchResult,
  SearchResourcesResponse,
} from "../resourceApi";
import { createResourceApi } from "../resourceApi";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface TestProps {
  apiUrl: string;
}

function makeResult(
  overrides: Partial<ResourceSearchResult<TestProps>> = {},
): ResourceSearchResult<TestProps> {
  return {
    name: "//kind.fleetshift.io/clusters/prod",
    platformResource: "clusters/prod",
    service: "kind.fleetshift.io",
    collection: "clusters",
    labels: {},
    conditions: [],
    properties: { apiUrl: "https://prod.example.com" },
    observations: {},
    createTime: "2026-01-01T00:00:00Z",
    updateTime: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function mockFetch(body: unknown, status = 200) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response);
}

/** Parse a relative URL string into path + URLSearchParams. */
function parseRelativeUrl(url: string) {
  const [path, qs] = url.split("?");
  return { path, params: new URLSearchParams(qs ?? "") };
}

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createResourceApi", () => {
  describe("search", () => {
    it("calls the correct URL with no params", async () => {
      const response: SearchResourcesResponse<TestProps> = {
        results: [makeResult()],
        nextPageToken: "",
      };
      const spy = mockFetch(response);
      const api = createResourceApi<TestProps>("-");

      const res = await api.search();

      expect(res.results).toHaveLength(1);
      expect(res.results[0].properties.apiUrl).toBe("https://prod.example.com");

      const calledUrl = spy.mock.calls[0][0] as string;
      expect(calledUrl).toBe("/apis/fleetshift.io/v1/-:searchResources");
    });

    it("passes filter, pageSize, and pageToken as query params", async () => {
      const spy = mockFetch({ results: [], nextPageToken: "" });
      const api = createResourceApi("-");

      await api.search({
        filter: 'collection == "clusters"',
        pageSize: 25,
        pageToken: "tok123",
      });

      const { path, params } = parseRelativeUrl(spy.mock.calls[0][0] as string);
      expect(path).toBe("/apis/fleetshift.io/v1/-:searchResources");
      expect(params.get("filter")).toBe('collection == "clusters"');
      expect(params.get("pageSize")).toBe("25");
      expect(params.get("pageToken")).toBe("tok123");
    });

    it("encodes the scope in the URL", async () => {
      const spy = mockFetch({ results: [], nextPageToken: "" });
      const api = createResourceApi("workspace/foo");

      await api.search();

      const calledUrl = spy.mock.calls[0][0] as string;
      expect(calledUrl).toBe(
        "/apis/fleetshift.io/v1/workspace%2Ffoo:searchResources",
      );
    });

    it("throws on non-OK response", async () => {
      mockFetch(null, 500);
      const api = createResourceApi("-");

      await expect(api.search()).rejects.toThrow("500");
    });
  });

  describe("list", () => {
    it("calls search without a filter", async () => {
      const spy = mockFetch({ results: [makeResult()], nextPageToken: "" });
      const api = createResourceApi<TestProps>("-");

      const res = await api.list({ pageSize: 10 });

      expect(res.results).toHaveLength(1);
      const { params } = parseRelativeUrl(spy.mock.calls[0][0] as string);
      expect(params.has("filter")).toBe(false);
      expect(params.get("pageSize")).toBe("10");
    });
  });

  describe("get", () => {
    it("returns the first matching result", async () => {
      const result = makeResult();
      mockFetch({ results: [result], nextPageToken: "" });
      const api = createResourceApi<TestProps>("-");

      const found = await api.get("//kind.fleetshift.io/clusters/prod");

      expect(found).toEqual(result);
    });

    it("returns undefined when no match", async () => {
      mockFetch({ results: [], nextPageToken: "" });
      const api = createResourceApi("-");

      const found = await api.get("//nonexistent");

      expect(found).toBeUndefined();
    });

    it("uses name filter and pageSize 1", async () => {
      const spy = mockFetch({ results: [], nextPageToken: "" });
      const api = createResourceApi("-");

      await api.get("//svc/res/id");

      const { params } = parseRelativeUrl(spy.mock.calls[0][0] as string);
      expect(params.get("filter")).toBe('name == "//svc/res/id"');
      expect(params.get("pageSize")).toBe("1");
    });
  });

  describe("searchAll", () => {
    it("yields pages and follows nextPageToken", async () => {
      const page1: SearchResourcesResponse = {
        results: [makeResult({ name: "//a" })],
        nextPageToken: "page2",
      };
      const page2: SearchResourcesResponse = {
        results: [makeResult({ name: "//b" })],
        nextPageToken: "",
      };

      const spy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: "OK",
          json: () => Promise.resolve(page1),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: "OK",
          json: () => Promise.resolve(page2),
        } as Response);

      const api = createResourceApi("-");
      const pages: unknown[][] = [];

      for await (const page of api.searchAll({ filter: 'collection == "x"' })) {
        pages.push(page);
      }

      expect(pages).toHaveLength(2);
      expect(pages[0]).toHaveLength(1);
      expect(pages[1]).toHaveLength(1);

      // Verify second call includes pageToken
      const { params } = parseRelativeUrl(spy.mock.calls[1][0] as string);
      expect(params.get("pageToken")).toBe("page2");
    });

    it("yields a single page when nextPageToken is empty", async () => {
      mockFetch({ results: [makeResult()], nextPageToken: "" });
      const api = createResourceApi("-");
      const pages: unknown[][] = [];

      for await (const page of api.searchAll()) {
        pages.push(page);
      }

      expect(pages).toHaveLength(1);
    });
  });
});
