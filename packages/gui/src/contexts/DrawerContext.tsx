import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

interface DrawerContextValue {
  isOpen: boolean;
  content: ReactNode | null;
  openDrawer: (content: ReactNode) => void;
  closeDrawer: () => void;
}

const DrawerContext = createContext<DrawerContextValue>({
  isOpen: false,
  content: null,
  openDrawer: () => {},
  closeDrawer: () => {},
});

export const useDrawer = () => useContext(DrawerContext);

export const DrawerProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState<ReactNode | null>(null);

  const openDrawer = useCallback((node: ReactNode) => {
    setContent(node);
    setIsOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
    setContent(null);
  }, []);

  return (
    <DrawerContext.Provider
      value={{ isOpen, content, openDrawer, closeDrawer }}
    >
      {children}
    </DrawerContext.Provider>
  );
};
