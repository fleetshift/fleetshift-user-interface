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

interface UserPreferencesContextValue {
  enabledPaths: string[];
  togglePath: (path: string) => void;
  isPathEnabled: (path: string) => boolean;
}

const UserPreferencesContext =
  createContext<UserPreferencesContextValue | null>(null);

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [enabledPaths, setEnabledPaths] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchUserPreferences(user.id).then(setEnabledPaths);
  }, [user]);

  const togglePath = useCallback(
    (path: string) => {
      if (!user) return;
      setEnabledPaths((prev) => {
        const next = prev.includes(path)
          ? prev.filter((p) => p !== path)
          : [...prev, path];
        updateUserPreferences(user.id, next);
        return next;
      });
    },
    [user],
  );

  const isPathEnabled = useCallback(
    (path: string) => enabledPaths.includes(path),
    [enabledPaths],
  );

  return (
    <UserPreferencesContext.Provider
      value={{ enabledPaths, togglePath, isPathEnabled }}
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
