import { describe, it, expect } from "vitest";
import { buildSignedInputEnvelope, hashIntent } from "../canonical";
import type {
  ManifestStrategy,
  PlacementStrategy,
  OutputConstraint,
} from "../canonical";

// Matches Go: time.Date(2026, 3, 11, 12, 0, 0, 0, time.UTC)
const testValidUntil = new Date(Date.UTC(2026, 2, 11, 12, 0, 0));

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Golden vectors generated from the Go implementation.
// Any drift between TS and Go will break attestation verification.

describe("buildSignedInputEnvelope", () => {
  it("vector 1: full envelope with manifests, targets, generation", () => {
    const ms: ManifestStrategy = {
      type: "inline",
      manifests: [
        { resourceType: "api.kind.cluster", content: { name: "c1" } },
      ],
    };
    const ps: PlacementStrategy = { type: "static", targets: ["target-a"] };
    const env = buildSignedInputEnvelope(
      "my-dep",
      ms,
      ps,
      testValidUntil,
      [],
      1,
    );

    expect(env).toBe(
      '{"content":{"deployment_id":"my-dep","manifest_strategy":{"type":"inline","manifests":[{"resource_type":"api.kind.cluster","content":{"name":"c1"}}]},"placement_strategy":{"type":"static","targets":["target-a"]}},"output_constraints":[],"valid_until":1773230400,"expected_generation":1}',
    );
  });

  it("vector 2: minimal envelope, generation=0 omitted", () => {
    const ms: ManifestStrategy = { type: "inline" };
    const ps: PlacementStrategy = { type: "all" };
    const env = buildSignedInputEnvelope(
      "dep-1",
      ms,
      ps,
      testValidUntil,
      [],
      0,
    );

    expect(env).toBe(
      '{"content":{"deployment_id":"dep-1","manifest_strategy":{"type":"inline"},"placement_strategy":{"type":"all"}},"output_constraints":[],"valid_until":1773230400}',
    );
  });

  it("vector 3: constraints sorted by JSON serialization", () => {
    const ms: ManifestStrategy = { type: "inline" };
    const ps: PlacementStrategy = { type: "all" };
    const constraints: OutputConstraint[] = [
      { name: "z-constraint", expression: "output.foo == true" },
      { name: "a-constraint", expression: "output.bar == true" },
    ];
    const env = buildSignedInputEnvelope(
      "dep-1",
      ms,
      ps,
      testValidUntil,
      constraints,
      1,
    );

    expect(env).toBe(
      '{"content":{"deployment_id":"dep-1","manifest_strategy":{"type":"inline"},"placement_strategy":{"type":"all"}},"output_constraints":[{"expression":"output.bar == true","name":"a-constraint"},{"expression":"output.foo == true","name":"z-constraint"}],"valid_until":1773230400,"expected_generation":1}',
    );
  });

  it("vector 4: match_labels with sorted keys", () => {
    const ms: ManifestStrategy = { type: "inline" };
    const ps: PlacementStrategy = {
      type: "label",
      matchLabels: { zone: "us-east", env: "prod" },
    };
    const env = buildSignedInputEnvelope(
      "dep-2",
      ms,
      ps,
      testValidUntil,
      [],
      1,
    );

    expect(env).toBe(
      '{"content":{"deployment_id":"dep-2","manifest_strategy":{"type":"inline"},"placement_strategy":{"type":"label","match_labels":{"env":"prod","zone":"us-east"}}},"output_constraints":[],"valid_until":1773230400,"expected_generation":1}',
    );
  });

  it("vector 5: multiple manifests", () => {
    const ms: ManifestStrategy = {
      type: "inline",
      manifests: [
        { resourceType: "Deployment", content: { replicas: 3 } },
        { resourceType: "Service", content: { port: 80 } },
      ],
    };
    const ps: PlacementStrategy = { type: "static", targets: ["t1", "t2"] };
    const env = buildSignedInputEnvelope(
      "dep-3",
      ms,
      ps,
      testValidUntil,
      [],
      2,
    );

    expect(env).toBe(
      '{"content":{"deployment_id":"dep-3","manifest_strategy":{"type":"inline","manifests":[{"resource_type":"Deployment","content":{"replicas":3}},{"resource_type":"Service","content":{"port":80}}]},"placement_strategy":{"type":"static","targets":["t1","t2"]}},"output_constraints":[],"valid_until":1773230400,"expected_generation":2}',
    );
  });

  it("is deterministic — same inputs produce same output", () => {
    const ms: ManifestStrategy = {
      type: "inline",
      manifests: [
        { resourceType: "api.kind.cluster", content: { name: "test-cluster" } },
      ],
    };
    const ps: PlacementStrategy = { type: "static", targets: ["t1", "t2"] };
    const a = buildSignedInputEnvelope("dep-1", ms, ps, testValidUntil, [], 1);
    const b = buildSignedInputEnvelope("dep-1", ms, ps, testValidUntil, [], 1);
    expect(a).toBe(b);
  });

  it("different deployment IDs produce different envelopes", () => {
    const ms: ManifestStrategy = { type: "inline" };
    const ps: PlacementStrategy = { type: "all" };
    const a = buildSignedInputEnvelope("dep-1", ms, ps, testValidUntil, [], 1);
    const b = buildSignedInputEnvelope("dep-2", ms, ps, testValidUntil, [], 1);
    expect(a).not.toBe(b);
  });
});

describe("hashIntent", () => {
  it("vector 1: matches Go SHA-256 hash", async () => {
    const envelope =
      '{"content":{"deployment_id":"my-dep","manifest_strategy":{"type":"inline","manifests":[{"resource_type":"api.kind.cluster","content":{"name":"c1"}}]},"placement_strategy":{"type":"static","targets":["target-a"]}},"output_constraints":[],"valid_until":1773230400,"expected_generation":1}';
    const hash = await hashIntent(envelope);
    expect(toHex(hash)).toBe(
      "d95d55ee0e33b260de77a6da91b7a70794cf08ebbe9ec17283570768a3d497ac",
    );
  });

  it("vector 2: minimal envelope hash", async () => {
    const envelope =
      '{"content":{"deployment_id":"dep-1","manifest_strategy":{"type":"inline"},"placement_strategy":{"type":"all"}},"output_constraints":[],"valid_until":1773230400}';
    const hash = await hashIntent(envelope);
    expect(toHex(hash)).toBe(
      "4bd6fbf0aff573befbaca9f28d0ea1eabca91aabca6757e3629cda597c97ddb1",
    );
  });

  it("returns 32 bytes (SHA-256)", async () => {
    const hash = await hashIntent("test");
    expect(hash.length).toBe(32);
  });

  it("is deterministic", async () => {
    const a = await hashIntent("test-data");
    const b = await hashIntent("test-data");
    expect(toHex(a)).toBe(toHex(b));
  });
});
