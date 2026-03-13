import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import {
  fetchUserPreferences,
  updateUserPreferences,
  fetchCanvasPages,
  createCanvasPage as apiCreatePage,
  updateCanvasPage as apiUpdatePage,
  deleteCanvasPage as apiDeletePage,
} from "../utils/api";
import { useInvalidationSocket } from "../hooks/useInvalidationSocket";
import type {
  NavLayoutEntry,
  CanvasPage,
  CanvasModule,
} from "../utils/extensions";
import { isPageInLayout } from "../utils/extensions";

interface UserPreferencesContextValue {
  navLayout: NavLayoutEntry[];
  updateNavLayout: (layout: NavLayoutEntry[]) => void;
  canvasPages: CanvasPage[];
  createPage: (title: string, path: string) => Promise<CanvasPage>;
  updatePage: (
    pageId: string,
    updates: { title?: string; path?: string; modules?: CanvasModule[] },
  ) => Promise<void>;
  deletePage: (pageId: string) => Promise<void>;
  getPage: (pageId: string) => CanvasPage | undefined;
  getPageByPath: (path: string) => CanvasPage | undefined;
  isPageInNav: (pageId: string) => boolean;
  togglePageInNav: (pageId: string) => void;
}

const UserPreferencesContext =
  createContext<UserPreferencesContextValue | null>(null);

interface UserPreferencesProviderProps {
  initialNavLayout: NavLayoutEntry[];
  initialCanvasPages: CanvasPage[];
  children: ReactNode;
}

export function UserPreferencesProvider({
  initialNavLayout,
  initialCanvasPages,
  children,
}: UserPreferencesProviderProps) {
  const { user } = useAuth();
  const [navLayout, setNavLayout] =
    useState<NavLayoutEntry[]>(initialNavLayout);
  const [canvasPages, setCanvasPages] =
    useState<CanvasPage[]>(initialCanvasPages);

  useInvalidationSocket(user?.id, (resource) => {
    if (!user) return;
    if (resource === "canvas_pages") {
      fetchCanvasPages(user.id).then(setCanvasPages);
    }
    if (resource === "nav_layout") {
      fetchUserPreferences(user.id).then(setNavLayout);
    }
  });

  const updateNavLayout = useCallback(
    (layout: NavLayoutEntry[]) => {
      if (!user) return;
      setNavLayout(layout);
      updateUserPreferences(user.id, layout);
    },
    [user],
  );

  const createPage = useCallback(
    async (title: string, path: string) => {
      if (!user) throw new Error("No user");
      const page = await apiCreatePage(user.id, title, path);
      setCanvasPages((prev) => [...prev, page]);
      return page;
    },
    [user],
  );

  const updatePage = useCallback(
    async (
      pageId: string,
      updates: { title?: string; path?: string; modules?: CanvasModule[] },
    ) => {
      if (!user) return;
      const updated = await apiUpdatePage(user.id, pageId, updates);
      setCanvasPages((prev) =>
        prev.map((p) => (p.id === pageId ? updated : p)),
      );
    },
    [user],
  );

  const deletePage = useCallback(
    async (pageId: string) => {
      if (!user) return;
      await apiDeletePage(user.id, pageId);
      setCanvasPages((prev) => prev.filter((p) => p.id !== pageId));
      // Remove from nav if present (top-level pages + section children)
      const filtered = navLayout
        .filter((e) => !(e.type === "page" && e.pageId === pageId))
        .map((e) =>
          e.type === "section"
            ? { ...e, children: e.children.filter((c) => c.pageId !== pageId) }
            : e,
        );
      if (JSON.stringify(filtered) !== JSON.stringify(navLayout)) {
        setNavLayout(filtered);
        updateUserPreferences(user.id, filtered);
      }
    },
    [user, navLayout],
  );

  const getPage = useCallback(
    (pageId: string) => canvasPages.find((p) => p.id === pageId),
    [canvasPages],
  );

  const getPageByPath = useCallback(
    (path: string) => {
      const exact = canvasPages.find((p) => p.path === path);
      if (exact) return exact;
      // Walk path segments right-to-left for longest prefix match
      const segments = path.split("/");
      for (let i = segments.length - 1; i > 0; i--) {
        const prefix = segments.slice(0, i).join("/");
        const match = canvasPages.find((p) => p.path === prefix);
        if (match) return match;
      }
      return undefined;
    },
    [canvasPages],
  );

  const isPageInNav = useCallback(
    (pageId: string) => isPageInLayout(navLayout, pageId),
    [navLayout],
  );

  const togglePageInNav = useCallback(
    (pageId: string) => {
      if (isPageInNav(pageId)) {
        // Remove from top-level and section children
        const filtered = navLayout
          .filter((e) => !(e.type === "page" && e.pageId === pageId))
          .map((e) =>
            e.type === "section"
              ? {
                  ...e,
                  children: e.children.filter((c) => c.pageId !== pageId),
                }
              : e,
          );
        updateNavLayout(filtered);
      } else {
        updateNavLayout([...navLayout, { type: "page", pageId }]);
      }
    },
    [isPageInNav, navLayout, updateNavLayout],
  );

  return (
    <UserPreferencesContext.Provider
      value={{
        navLayout,
        updateNavLayout,
        canvasPages,
        createPage,
        updatePage,
        deletePage,
        getPage,
        getPageByPath,
        isPageInNav,
        togglePageInNav,
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences(): UserPreferencesContextValue {
  const ctx = useContext(UserPreferencesContext);
  if (!ctx)
    throw new Error(
      "useUserPreferences must be used within a UserPreferencesProvider",
    );
  return ctx;
}
