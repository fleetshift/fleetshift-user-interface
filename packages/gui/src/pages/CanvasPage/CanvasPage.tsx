import { useParams, useNavigate } from "react-router-dom";
import { useState, useCallback, useRef, useEffect } from "react";
import {
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  Flex,
  FlexItem,
  Title,
  TextInput,
  Spinner,
} from "@patternfly/react-core";
import { CubesIcon, PencilAltIcon, TimesIcon } from "@patternfly/react-icons";
import { ScalprumComponent, useScalprum } from "@scalprum/react-core";
import {
  GridLayout,
  useContainerWidth,
  verticalCompactor,
} from "react-grid-layout";
import type { Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { useUserPreferences } from "../../contexts/UserPreferencesContext";
import { useScope } from "../../contexts/ScopeContext";
import { useDrawer } from "../../contexts/DrawerContext";
import { pluginKeyFromName } from "../../utils/extensions";
import type { CanvasModule, ModuleRef } from "../../utils/extensions";
import { useAvailableModules } from "./useAvailableModules";
import { ModulePalette } from "./ModulePalette";
import "./CanvasPage.scss";

const ModuleUnavailable = ({
  moduleName,
  onRemove,
}: {
  moduleName: string;
  onRemove: () => void;
}) => (
  <EmptyState icon={CubesIcon} headingLevel="h3" titleText="Plugin unavailable">
    <EmptyStateBody>
      The plugin providing <strong>{moduleName}</strong> is not currently
      available. It may have been disabled or uninstalled.
    </EmptyStateBody>
    <EmptyStateFooter>
      <EmptyStateActions>
        <Button variant="secondary" onClick={onRemove}>
          Remove from page
        </Button>
      </EmptyStateActions>
    </EmptyStateFooter>
  </EmptyState>
);

let instanceCounter = 0;

const useLayoutWidth = (
  containerRef: React.RefObject<HTMLDivElement | null>,
) => {
  const [width, setWidth] = useState(1200);
  useEffect(() => {
    if (containerRef.current) {
      const resize = () => {
        setWidth(
          containerRef.current
            ? containerRef.current.getBoundingClientRect().width
            : 1200,
        );
      };
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(containerRef.current);
      window.addEventListener("resize", resize);
      return () => {
        window.removeEventListener("resize", resize);
        resizeObserver.disconnect();
      };
    }
  }, [containerRef.current]);

  return width;
};

export const CanvasPage = ({
  pageId: propPageId,
}: { pageId?: string } = {}) => {
  const params = useParams();
  const paramPageId = propPageId ?? params.pageId;
  const canvasPath = params["*"];
  const navigate = useNavigate();
  const { getPage, getPageByPath, updatePage, canvasPages } =
    useUserPreferences();
  const { clusterIdsForPlugin } = useScope();
  const { config: scalprumConfig } = useScalprum();
  const availableModules = useAvailableModules();
  const { isOpen, drawerKey, openDrawer, closeDrawer } = useDrawer();
  const editing = isOpen && drawerKey === "canvas-edit";

  const [editTitle, setEditTitle] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);

  const page = paramPageId
    ? getPage(paramPageId)
    : canvasPath
      ? getPageByPath(canvasPath)
      : undefined;
  const pageId = page?.id;

  // Debounced save
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const saveModules = useCallback(
    (modules: CanvasModule[]) => {
      if (!pageId) return;
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        updatePage(pageId, { modules });
      }, 500);
    },
    [pageId, updatePage],
  );

  useEffect(() => {
    return () => {
      clearTimeout(saveTimerRef.current);
      closeDrawer();
    };
  }, [closeDrawer]);

  const { containerRef, mounted } = useContainerWidth();
  const width = useLayoutWidth(containerRef);

  const handleLayoutChange = useCallback(
    (newLayout: Layout) => {
      if (!page) return;
      const updated = page.modules.map((mod) => {
        const layoutItem = newLayout.find((l) => l.i === mod.i);
        if (!layoutItem) return mod;
        return {
          ...mod,
          x: layoutItem.x,
          y: layoutItem.y,
          w: layoutItem.w,
          h: layoutItem.h,
        };
      });
      saveModules(updated);
    },
    [page, saveModules],
  );

  const addModule = useCallback(
    (ref: ModuleRef) => {
      if (!page || !pageId) return;
      const mod: CanvasModule = {
        i: `mod-${Date.now()}-${instanceCounter++}`,
        x: 0,
        y: Infinity,
        w: 6,
        h: 4,
        moduleRef: ref,
      };
      const updated = [...page.modules, mod];
      updatePage(pageId, { modules: updated });
    },
    [page, pageId, updatePage],
  );

  const removeModule = useCallback(
    (instanceId: string) => {
      if (!page || !pageId) return;
      const updated = page.modules.filter((m) => m.i !== instanceId);
      updatePage(pageId, { modules: updated });
    },
    [page, pageId, updatePage],
  );

  const saveTitle = useCallback(() => {
    if (!pageId || !editTitle.trim()) return;
    updatePage(pageId, { title: editTitle.trim() });
    setEditingTitle(false);
  }, [pageId, editTitle, updatePage]);

  // Keep drawer content in sync while open
  useEffect(() => {
    if (editing && page) {
      openDrawer(
        <ModulePalette
          modules={availableModules}
          clusterIdsForPlugin={clusterIdsForPlugin}
          onAdd={addModule}
        />,
        "canvas-edit",
      );
    }
  }, [
    editing,
    availableModules,
    page?.modules,
    clusterIdsForPlugin,
    addModule,
    openDrawer,
  ]);

  const toggleEditing = useCallback(() => {
    if (editing) {
      closeDrawer();
    } else {
      openDrawer(
        <ModulePalette
          modules={availableModules}
          clusterIdsForPlugin={clusterIdsForPlugin}
          onAdd={addModule}
        />,
        "canvas-edit",
      );
    }
  }, [
    editing,
    closeDrawer,
    openDrawer,
    availableModules,
    clusterIdsForPlugin,
    addModule,
  ]);

  if (!canvasPages.length && !page) {
    return <Spinner size="xl" />;
  }

  if (!page) {
    return (
      <div>
        <Title headingLevel="h1">Page not found</Title>
        <Button variant="link" onClick={() => navigate("/pages")}>
          Back to Composer
        </Button>
      </div>
    );
  }

  const layout: Layout = page.modules.map((m) => ({
    i: m.i,
    x: m.x,
    y: m.y,
    w: m.w,
    h: m.h,
  }));

  return (
    <div>
      <Flex
        justifyContent={{ default: "justifyContentSpaceBetween" }}
        alignItems={{ default: "alignItemsCenter" }}
        className="fs-canvas-page__header"
      >
        <FlexItem>
          {editingTitle ? (
            <Flex
              alignItems={{ default: "alignItemsCenter" }}
              gap={{ default: "gapSm" }}
            >
              <FlexItem>
                <TextInput
                  value={editTitle}
                  onChange={(_e, val) => setEditTitle(val)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveTitle();
                    if (e.key === "Escape") setEditingTitle(false);
                  }}
                  aria-label="Page title"
                  autoFocus
                />
              </FlexItem>
              <FlexItem>
                <Button variant="primary" size="sm" onClick={saveTitle}>
                  Save
                </Button>
              </FlexItem>
              <FlexItem>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setEditingTitle(false)}
                >
                  Cancel
                </Button>
              </FlexItem>
            </Flex>
          ) : (
            <Flex
              alignItems={{ default: "alignItemsCenter" }}
              gap={{ default: "gapSm" }}
            >
              <FlexItem>
                <Title headingLevel="h1">{page.title}</Title>
              </FlexItem>
              <FlexItem>
                <Button
                  variant="plain"
                  size="sm"
                  aria-label="Edit title"
                  onClick={() => {
                    setEditTitle(page.title);
                    setEditingTitle(true);
                  }}
                  icon={<PencilAltIcon />}
                />
              </FlexItem>
            </Flex>
          )}
        </FlexItem>
        <FlexItem>
          <Button
            variant={editing ? "primary" : "secondary"}
            onClick={toggleEditing}
            icon={editing ? undefined : <PencilAltIcon />}
          >
            {editing ? "Done" : "Edit"}
          </Button>
        </FlexItem>
      </Flex>
      <div
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ref={containerRef as any}
        className={editing ? "fs-canvas-grid--editing" : "fs-canvas-grid--view"}
      >
        {mounted && page.modules.length > 0 && (
          <GridLayout
            width={width}
            layout={layout}
            gridConfig={{ cols: 12, rowHeight: 80 }}
            dragConfig={{ enabled: editing }}
            resizeConfig={{ enabled: editing }}
            onLayoutChange={handleLayoutChange}
            compactor={verticalCompactor}
          >
            {page.modules.map((mod) => {
              const pluginKey = pluginKeyFromName(mod.moduleRef.scope);
              const clusterIds = clusterIdsForPlugin(pluginKey);
              const isAvailable = mod.moduleRef.scope in scalprumConfig;
              return (
                <div key={mod.i} className="fs-module-card">
                  {editing && (
                    <Button
                      variant="plain"
                      size="sm"
                      aria-label="Remove module"
                      onClick={() => removeModule(mod.i)}
                      icon={<TimesIcon />}
                      className="fs-module-card__remove"
                    />
                  )}
                  <div className="fs-module-card__content">
                    {isAvailable ? (
                      <ScalprumComponent
                        scope={mod.moduleRef.scope}
                        module={mod.moduleRef.module}
                        fallback={<Spinner size="lg" />}
                        ErrorComponent={
                          <ModuleUnavailable
                            moduleName={mod.moduleRef.module}
                            onRemove={() => removeModule(mod.i)}
                          />
                        }
                        {...{ clusterIds }}
                      />
                    ) : (
                      <ModuleUnavailable
                        moduleName={mod.moduleRef.module}
                        onRemove={() => removeModule(mod.i)}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </GridLayout>
        )}
        {page.modules.length === 0 && (
          <div className="fs-canvas-page__empty">
            {editing
              ? "Add modules from the palette on the right."
              : 'No modules on this page. Click "Edit" to add some.'}
          </div>
        )}
      </div>
    </div>
  );
};
