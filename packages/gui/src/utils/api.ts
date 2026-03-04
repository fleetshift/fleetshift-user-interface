const API_BASE = "http://localhost:4000/api/v1";

export interface AvailableCluster {
  id: string;
  name: string;
  version: string;
  installed: boolean;
}

export interface InstalledCluster {
  id: string;
  name: string;
  status: string;
  version: string;
  plugins: string[];
  created_at: string;
}

export async function fetchAvailableClusters(): Promise<AvailableCluster[]> {
  const res = await fetch(`${API_BASE}/clusters/available`);
  return res.json();
}

export async function fetchInstalledClusters(): Promise<InstalledCluster[]> {
  const res = await fetch(`${API_BASE}/clusters`);
  return res.json();
}

export async function fetchCluster(id: string): Promise<InstalledCluster> {
  const res = await fetch(`${API_BASE}/clusters/${id}`);
  return res.json();
}

export async function installCluster(id: string): Promise<InstalledCluster> {
  const res = await fetch(`${API_BASE}/clusters/${id}/install`, {
    method: "POST",
  });
  return res.json();
}

export async function uninstallCluster(id: string): Promise<void> {
  await fetch(`${API_BASE}/clusters/${id}`, { method: "DELETE" });
}

export async function updateClusterPlugins(
  id: string,
  plugins: string[],
): Promise<InstalledCluster> {
  const res = await fetch(`${API_BASE}/clusters/${id}/plugins`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plugins }),
  });
  return res.json();
}

import type { NavLayoutEntry, CanvasPage, CanvasModule } from "./extensions";

export interface User {
  id: string;
  username: string;
  display_name: string;
  role: string;
  navLayout: NavLayoutEntry[];
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ navLayout }),
  });
  const data = await res.json();
  return data.navLayout;
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
    headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
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
  });
}
