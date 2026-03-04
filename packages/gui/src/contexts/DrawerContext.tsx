import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

interface DrawerContextValue {
  isOpen: boolean;
  drawerKey: string | null;
  content: ReactNode | null;
  openDrawer: (content: ReactNode, key?: string) => void;
  closeDrawer: () => void;
}

const DrawerContext = createContext<DrawerContextValue>({
  isOpen: false,
  drawerKey: null,
  content: null,
  openDrawer: () => {},
  closeDrawer: () => {},
});

export const useDrawer = () => useContext(DrawerContext);

export const DrawerProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [drawerKey, setDrawerKey] = useState<string | null>(null);
  const [content, setContent] = useState<ReactNode | null>(null);

  const openDrawer = useCallback((node: ReactNode, key?: string) => {
    setContent(node);
    setDrawerKey(key ?? null);
    setIsOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
    setDrawerKey(null);
    setContent(null);
  }, []);

  return (
    <DrawerContext.Provider
      value={{ isOpen, drawerKey, content, openDrawer, closeDrawer }}
    >
      {children}
    </DrawerContext.Provider>
  );
};
