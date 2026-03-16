import type {
  AvailableCluster,
  Cluster,
  User as BaseUser,
} from "@fleetshift/common";
import {
  fetchAvailableClusters as commonFetchAvailable,
  fetchClusters as commonFetchInstalled,
  fetchCluster as commonFetchCluster,
} from "@fleetshift/common";
import { getSessionId } from "../hooks/useInvalidationSocket";
import type { NavLayoutEntry, CanvasPage, CanvasModule } from "./extensions";

const API_BASE = "http://localhost:4000/api/v1";

export type { AvailableCluster };
export type InstalledCluster = Cluster;

export interface User extends BaseUser {
  navLayout: NavLayoutEntry[];
}

function mutationHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const sid = getSessionId();
  if (sid) headers["X-Session-Id"] = sid;
  return headers;
}

export function fetchAvailableClusters(): Promise<AvailableCluster[]> {
  return commonFetchAvailable(API_BASE);
}

export function fetchInstalledClusters(): Promise<InstalledCluster[]> {
  return commonFetchInstalled(API_BASE);
}

export function fetchCluster(id: string): Promise<InstalledCluster> {
  return commonFetchCluster(API_BASE, id);
}

export async function login(username: string): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) throw new Error("Login failed");
  return res.json();
}

export async function fetchUserPreferences(
  userId: string,
): Promise<NavLayoutEntry[]> {
  const res = await fetch(`${API_BASE}/users/${userId}/preferences`);
  const data = await res.json();
  return data.navLayout;
}

export async function updateUserPreferences(
  userId: string,
  navLayout: NavLayoutEntry[],
): Promise<NavLayoutEntry[]> {
  const res = await fetch(`${API_BASE}/users/${userId}/preferences`, {
    method: "PUT",
    headers: mutationHeaders(),
    body: JSON.stringify({ navLayout }),
  });
  const data = await res.json();
  return data.navLayout;
}

// --- Clusters ---

export interface CreateClusterRequest {
  name: string;
  type: "kubeconfig" | "token";
  context?: string;
  server?: string;
  token?: string;
  skipTLSVerify?: boolean;
}

export async function createCluster(
  data: CreateClusterRequest,
): Promise<InstalledCluster> {
  const res = await fetch(`${API_BASE}/clusters`, {
    method: "POST",
    headers: mutationHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to create cluster (${res.status})`);
  }
  return res.json();
}

export async function updateClusterToken(
  id: string,
  token: string,
): Promise<InstalledCluster> {
  const res = await fetch(`${API_BASE}/clusters/${id}`, {
    method: "PATCH",
    headers: mutationHeaders(),
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      body.error || `Failed to update cluster token (${res.status})`,
    );
  }
  return res.json();
}

export async function deleteCluster(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/clusters/${id}`, {
    method: "DELETE",
    headers: mutationHeaders(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to delete cluster (${res.status})`);
  }
}

// --- Canvas Pages ---

export async function fetchCanvasPages(userId: string): Promise<CanvasPage[]> {
  const res = await fetch(`${API_BASE}/users/${userId}/canvas-pages`);
  const data = await res.json();
  return data.pages;
}

export async function createCanvasPage(
  userId: string,
  title: string,
  path: string,
): Promise<CanvasPage> {
  const res = await fetch(`${API_BASE}/users/${userId}/canvas-pages`, {
    method: "POST",
    headers: mutationHeaders(),
    body: JSON.stringify({ title, path }),
  });
  return res.json();
}

export async function updateCanvasPage(
  userId: string,
  pageId: string,
  updates: { title?: string; path?: string; modules?: CanvasModule[] },
): Promise<CanvasPage> {
  const res = await fetch(
    `${API_BASE}/users/${userId}/canvas-pages/${pageId}`,
    {
      method: "PUT",
      headers: mutationHeaders(),
      body: JSON.stringify(updates),
    },
  );
  return res.json();
}

export async function deleteCanvasPage(
  userId: string,
  pageId: string,
): Promise<void> {
  await fetch(`${API_BASE}/users/${userId}/canvas-pages/${pageId}`, {
    method: "DELETE",
    headers: mutationHeaders(),
  });
}
