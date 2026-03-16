/**
 * Format a date string as a relative time string (e.g., "5m ago", "2h ago", "3d ago").
 * Handles ISO timestamps and "YYYY-MM-DD HH:MM:SS" strings.
 */
export function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return "\u2014";
  const raw = dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T") + "Z";
  const date = new Date(raw);
  const now = Date.now();
  const diffMs = now - date.getTime();
  if (isNaN(diffMs) || diffMs < 0) return "just now";
  const secs = Math.floor(diffMs / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

/**
 * Format a date string as a compact age string without "ago" (e.g., "5m", "2h", "3d").
 * Useful for table cells like pod age.
 */
export function formatAge(dateStr: string): string {
  if (!dateStr) return "\u2014";
  const raw = dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T") + "Z";
  const created = new Date(raw);
  const now = Date.now();
  const diffMs = now - created.getTime();
  if (isNaN(diffMs) || diffMs < 0) return "just now";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

/**
 * Format a duration in seconds to a human-readable string (e.g., "2m 30s", "1h 15m").
 */
export function formatDuration(seconds: number): string {
  if (seconds < 0) return "\u2014";
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hours}h ${remainMins}m` : `${hours}h`;
}

/**
 * Parsed capacity value with numeric value and unit string.
 */
export interface ParsedCapacity {
  value: number;
  unit: string;
}

/**
 * Parse a Kubernetes capacity string (e.g., "10Gi", "500Mi", "1Ti") into
 * a structured object with numeric value and human-readable unit.
 * Returns the value and a display-friendly unit string.
 */
export function parseCapacity(capacity: string): ParsedCapacity {
  if (!capacity) return { value: 0, unit: "" };
  const match = capacity.match(/^(\d+(?:\.\d+)?)\s*([A-Za-z]*)$/);
  if (!match) return { value: 0, unit: capacity };
  const value = parseFloat(match[1]);
  const suffix = match[2];

  switch (suffix) {
    case "Ki":
      return { value, unit: "KiB" };
    case "Mi":
      return { value, unit: "MiB" };
    case "Gi":
      return { value, unit: "GiB" };
    case "Ti":
      return { value, unit: "TiB" };
    case "Pi":
      return { value, unit: "PiB" };
    case "k":
      return { value, unit: "KB" };
    case "M":
      return { value, unit: "MB" };
    case "G":
      return { value, unit: "GB" };
    case "T":
      return { value, unit: "TB" };
    default:
      return { value, unit: suffix || "B" };
  }
}

/**
 * Format a Kubernetes capacity string for display (e.g., "10Gi" → "10 GiB").
 */
export function formatCapacity(capacity: string): string {
  const { value, unit } = parseCapacity(capacity);
  return `${value} ${unit}`;
}

/**
 * Format memory in mebibytes (Mi) to a human-readable GB string.
 */
export function formatMemoryGiB(mi: number): string {
  return `${(mi / 1024).toFixed(1)} GiB`;
}

/**
 * Truncate a string to a maximum length, appending an ellipsis if truncated.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "\u2026";
}

/**
 * Map Kubernetes access modes to short labels.
 */
export function accessModeLabel(mode: string): string {
  switch (mode) {
    case "ReadWriteOnce":
      return "RWO";
    case "ReadOnlyMany":
      return "ROX";
    case "ReadWriteMany":
      return "RWX";
    case "ReadWriteOncePod":
      return "RWOP";
    default:
      return mode;
  }
}
