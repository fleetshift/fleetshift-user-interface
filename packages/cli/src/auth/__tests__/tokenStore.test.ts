import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSetPassword = vi.fn();
const mockGetPassword = vi.fn();
const mockDeletePassword = vi.fn();

vi.mock("@napi-rs/keyring", () => {
  function Entry() {
    // @ts-expect-error -- mock constructor
    this.setPassword = mockSetPassword;
    // @ts-expect-error -- mock constructor
    this.getPassword = mockGetPassword;
    // @ts-expect-error -- mock constructor
    this.deletePassword = mockDeletePassword;
  }
  return { Entry };
});

// Import after mock is set up
const { saveTokens, loadTokens, clearTokens, getValidToken } =
  await import("../tokenStore");

const sampleTokens = {
  access_token: "access-123",
  refresh_token: "refresh-456",
  expires_at: Date.now() + 60_000,
  keycloak_url: "http://localhost:8180",
};

describe("saveTokens", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls entry.setPassword with JSON", () => {
    saveTokens(sampleTokens);
    expect(mockSetPassword).toHaveBeenCalledWith(JSON.stringify(sampleTokens));
  });
});

describe("loadTokens", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns parsed tokens when keyring has data", () => {
    mockGetPassword.mockReturnValue(JSON.stringify(sampleTokens));
    const result = loadTokens();
    expect(result).toEqual(sampleTokens);
  });

  it("returns null when keyring returns empty", () => {
    mockGetPassword.mockReturnValue("");
    const result = loadTokens();
    expect(result).toBeNull();
  });

  it("returns null when keyring throws", () => {
    mockGetPassword.mockImplementation(function () {
      throw new Error("No entry found");
    });
    const result = loadTokens();
    expect(result).toBeNull();
  });
});

describe("clearTokens", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls entry.deletePassword", () => {
    clearTokens();
    expect(mockDeletePassword).toHaveBeenCalled();
  });

  it("does not throw when keyring throws", () => {
    mockDeletePassword.mockImplementation(function () {
      throw new Error("No entry found");
    });
    expect(() => clearTokens()).not.toThrow();
  });
});

describe("getValidToken", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns access_token when not expired", async () => {
    mockGetPassword.mockReturnValue(JSON.stringify(sampleTokens));
    const token = await getValidToken();
    expect(token).toBe("access-123");
  });

  it("returns null when no tokens stored", async () => {
    mockGetPassword.mockReturnValue("");
    const token = await getValidToken();
    expect(token).toBeNull();
  });

  it("calls refresh endpoint when expired", async () => {
    const expiredTokens = {
      ...sampleTokens,
      expires_at: Date.now() - 60_000,
    };
    mockGetPassword.mockReturnValue(JSON.stringify(expiredTokens));

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: "new-access",
          refresh_token: "new-refresh",
          expires_in: 300,
        }),
    });
    globalThis.fetch = mockFetch;

    const token = await getValidToken();
    expect(token).toBe("new-access");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/protocol/openid-connect/token"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("returns null when refresh fails", async () => {
    const expiredTokens = {
      ...sampleTokens,
      expires_at: Date.now() - 60_000,
    };
    mockGetPassword.mockReturnValue(JSON.stringify(expiredTokens));

    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 400 });

    const token = await getValidToken();
    expect(token).toBeNull();
  });
});
