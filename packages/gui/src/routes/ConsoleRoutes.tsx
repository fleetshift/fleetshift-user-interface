import { useMemo } from "react";
import { useAppConfig } from "../contexts/AppConfigContext";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { DebugPage } from "../pages/DebugPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { PluginPage } from "../pages/PluginPage";
import { AuthProvider } from "../contexts/AuthContext";
import AuthGate from "../components/Auth/AuthGate";
import AppConfigBridge from "../components/Root/AppConfigBridge";

const ConsoleRoutes = () => {
  const { pluginPages, navLayout } = useAppConfig();

  const sortedPages = useMemo(
    () => [...pluginPages].sort((a, b) => b.path.length - a.path.length),
    [pluginPages],
  );

  const pageMap = useMemo(() => {
    const map = new Map<string, (typeof pluginPages)[number]>();
    for (const page of pluginPages) map.set(page.id, page);
    return map;
  }, [pluginPages]);

  const firstNavPath = useMemo(() => {
    for (const entry of navLayout) {
      if (entry.type === "page") {
        const page = pageMap.get(entry.pageId);
        if (page) return `/${page.path}`;
      }
    }
    return "/debug";
  }, [navLayout, pageMap]);

  return (
    <AuthProvider>
      <AuthGate>
        <AppConfigBridge>
          <Routes>
            <Route element={<AppLayout />}>
              <Route
                path="/"
                element={<Navigate to={firstNavPath} replace />}
              />
              <Route path="/debug" element={<DebugPage />} />
              {sortedPages.map((page) => (
                <Route
                  key={page.id}
                  path={`/${page.path}/*`}
                  element={
                    <PluginPage
                      scope={page.scope}
                      module={page.module}
                      pluginKey={page.pluginKey}
                    />
                  }
                />
              ))}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </AppConfigBridge>
      </AuthGate>
    </AuthProvider>
  );
};

export default ConsoleRoutes;
