import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { User, login as apiLogin } from "../utils/api";

interface AuthContextValue {
  user: User | null;
  switchUser: (username: string) => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "fleetshift_user";

function getStoredUsername(): string {
  return localStorage.getItem(STORAGE_KEY) || "ops";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const switchUser = useCallback(async (username: string) => {
    const u = await apiLogin(username);
    localStorage.setItem(STORAGE_KEY, username);
    setUser(u);
  }, []);

  useEffect(() => {
    switchUser(getStoredUsername()).then(() => setLoading(false));
  }, [switchUser]);

  return (
    <AuthContext.Provider value={{ user, switchUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
