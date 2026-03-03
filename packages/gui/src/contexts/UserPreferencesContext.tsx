import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { fetchUserPreferences, updateUserPreferences } from "../utils/api";
import type { NavLayoutEntry } from "../utils/extensions";
import { isPathInLayout } from "../utils/extensions";

interface UserPreferencesContextValue {
  navLayout: NavLayoutEntry[];
  updateNavLayout: (layout: NavLayoutEntry[]) => void;
  isPathEnabled: (path: string) => boolean;
}

const UserPreferencesContext =
  createContext<UserPreferencesContextValue | null>(null);

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [navLayout, setNavLayout] = useState<NavLayoutEntry[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchUserPreferences(user.id).then(setNavLayout);
  }, [user]);

  const updateNavLayout = useCallback(
    (layout: NavLayoutEntry[]) => {
      if (!user) return;
      setNavLayout(layout);
      updateUserPreferences(user.id, layout);
    },
    [user],
  );

  const isPathEnabled = useCallback(
    (path: string) => isPathInLayout(navLayout, path),
    [navLayout],
  );

  return (
    <UserPreferencesContext.Provider
      value={{ navLayout, updateNavLayout, isPathEnabled }}
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
