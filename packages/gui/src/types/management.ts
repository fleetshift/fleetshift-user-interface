/**
 * TypeScript interfaces for the FleetShift management plane API.
 * These match the JSON output of the Go backend's grpc-gateway.
 */

// --- Manifest Strategy ---

export interface Manifest {
  resource_type: string;
  /** Base64-encoded raw content (protobuf bytes → JSON) */
  raw: string;
}

export interface ManifestStrategy {
  type: ManifestStrategyType;
  manifests?: Manifest[];
}

export type ManifestStrategyType = "TYPE_UNSPECIFIED" | "TYPE_INLINE";

// --- Placement Strategy ---

export interface TargetSelector {
  match_labels: Record<string, string>;
}

export interface PlacementStrategy {
  type: PlacementStrategyType;
  target_ids?: string[];
  target_selector?: TargetSelector;
}

export type PlacementStrategyType =
  | "TYPE_UNSPECIFIED"
  | "TYPE_STATIC"
  | "TYPE_ALL"
  | "TYPE_SELECTOR";

// --- Rollout Strategy ---

export interface RolloutStrategy {
  type: RolloutStrategyType;
}

export type RolloutStrategyType = "TYPE_UNSPECIFIED" | "TYPE_IMMEDIATE";

// --- Deployment ---

export type DeploymentState =
  | "STATE_UNSPECIFIED"
  | "STATE_CREATING"
  | "STATE_ACTIVE"
  | "STATE_DELETING"
  | "STATE_FAILED"
  | "STATE_PAUSED_AUTH";

export interface MgmtDeployment {
  name: string;
  uid: string;
  manifest_strategy: ManifestStrategy;
  placement_strategy: PlacementStrategy;
  rollout_strategy?: RolloutStrategy;
  resolved_target_ids: string[];
  state: DeploymentState;
  reconciling: boolean;
  create_time: string;
  update_time: string;
  etag: string;
}

export interface ListDeploymentsResponse {
  deployments: MgmtDeployment[];
  next_page_token: string;
}

export interface CreateDeploymentRequest {
  deployment: {
    manifest_strategy: ManifestStrategy;
    placement_strategy: PlacementStrategy;
    rollout_strategy?: RolloutStrategy;
  };
}

// --- Auth Method ---

export interface OIDCConfig {
  issuer_url: string;
  audience: string;
  key_enrollment_audience?: string;
  /** Output only — resolved from OIDC discovery */
  authorization_endpoint?: string;
  /** Output only */
  token_endpoint?: string;
  /** Output only */
  jwks_uri?: string;
}

export interface AuthMethod {
  name: string;
  type: AuthMethodType;
  oidc_config?: OIDCConfig;
}

export type AuthMethodType = "TYPE_UNSPECIFIED" | "TYPE_OIDC";

export interface CreateAuthMethodRequest {
  auth_method: {
    type: AuthMethodType;
    oidc_config?: OIDCConfig;
  };
}
