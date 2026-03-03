import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  Button,
  Flex,
  FlexItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextInput,
  Title,
} from "@patternfly/react-core";
import { PlusCircleIcon, PlusIcon } from "@patternfly/react-icons";
import { DragDropProvider, DragOverlay } from "@dnd-kit/react";
import type { DragStartEvent, DragEndEvent } from "@dnd-kit/react";
import { useResolvedExtensions } from "@openshift/dynamic-plugin-sdk";
import {
  isNavItem,
  pluginKeyFromName,
  isPathInLayout,
} from "../utils/extensions";
import { useUserPreferences } from "../contexts/UserPreferencesContext";
import { useScope } from "../contexts/ScopeContext";
import {
  TreeItem,
  TreeItemOverlay,
} from "../components/NavLayoutTree/TreeItem";
import {
  flattenLayout,
  buildLayout,
  getProjection,
  getDescendantIds,
  arrayMove,
} from "../components/NavLayoutTree/utilities";
import type { FlatNode } from "../components/NavLayoutTree/utilities";

let sectionIdCounter = 0;
function nextSectionId(): string {
  return `section-${Date.now()}-${sectionIdCounter++}`;
}

export const MarketplacePage = () => {
  const [navExtensions, resolved] = useResolvedExtensions(isNavItem);
  const { navLayout, updateNavLayout } = useUserPreferences();
  const { clusterIdsForPlugin } = useScope();

  // Label lookup from ALL resolved extensions (including disabled plugins)
  const labelByPath = useMemo(() => {
    if (!resolved) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const ext of navExtensions) {
      if (!map.has(ext.properties.path)) {
        map.set(ext.properties.path, ext.properties.label);
      }
    }
    return map;
  }, [navExtensions, resolved]);

  // All available extensions (deduplicated, at least one cluster has the plugin)
  const allExtensions = useMemo(() => {
    if (!resolved) return [];
    const seen = new Set<string>();
    return navExtensions.filter((ext) => {
      if (seen.has(ext.properties.path)) return false;
      seen.add(ext.properties.path);
      const pluginKey = pluginKeyFromName(ext.pluginName);
      return clusterIdsForPlugin(pluginKey).length > 0;
    });
  }, [navExtensions, resolved, clusterIdsForPlugin]);

  // Set of paths whose plugin is currently available
  const availablePaths = useMemo(() => {
    return new Set(allExtensions.map((ext) => ext.properties.path));
  }, [allExtensions]);

  const getLabel = useCallback(
    (node: FlatNode) => {
      if (node.kind === "section") return node.label || "Untitled";
      return labelByPath.get(node.path!) || node.path!;
    },
    [labelByPath],
  );

  // Available (not in layout) extensions
  const availableExtensions = useMemo(
    () =>
      allExtensions.filter(
        (ext) => !isPathInLayout(navLayout, ext.properties.path),
      ),
    [allExtensions, navLayout],
  );

  // --- Flat node state for drag-and-drop ---
  const [items, setItems] = useState<FlatNode[]>(() =>
    flattenLayout(navLayout),
  );

  // Sync items when navLayout changes from outside (e.g. user switch)
  useEffect(() => {
    setItems(flattenLayout(navLayout));
  }, [navLayout]);

  // --- Drag state ---
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const initialDepthRef = useRef(0);
  const descendantsRef = useRef<FlatNode[]>([]);

  // Active node info for overlay
  const activeNode = activeId ? items.find((i) => i.id === activeId) : null;

  // --- Drag handlers ---
  const handleDragStart = useCallback(
    (event: Parameters<NonNullable<DragStartEvent>>[0]) => {
      const { source } = event.operation;
      if (!source) return;
      const id = String(source.id);

      activeIdRef.current = id;

      setActiveId(id);

      const node = items.find((i) => i.id === id);
      if (!node) return;

      initialDepthRef.current = node.depth;

      // If dragging a section, remove its children from the visible list
      if (node.kind === "section") {
        const descIds = getDescendantIds(items, id);
        const removed = items.filter((i) => descIds.includes(i.id));
        descendantsRef.current = removed;
        setItems((prev) => prev.filter((i) => !descIds.includes(i.id)));
      }
    },
    [items],
  );

  const handleDragOver = useCallback(
    (event: {
      operation: {
        source: { id: string | number } | null;
        target: { id: string | number } | null;
        transform: { x: number };
      };
    }) => {
      const { source, target } = event.operation;
      if (!source || !target || source.id === target.id) return;

      const sourceId = String(source.id);
      const targetId = String(target.id);

      setItems((prev) => {
        const sourceIdx = prev.findIndex((i) => i.id === sourceId);
        const targetIdx = prev.findIndex((i) => i.id === targetId);
        if (sourceIdx === -1 || targetIdx === -1) return prev;

        const reordered = arrayMove(prev, sourceIdx, targetIdx);

        // Calculate depth projection
        const proj = getProjection(
          reordered,
          sourceId,
          event.operation.transform.x,
          initialDepthRef.current,
        );

        return reordered.map((i) =>
          i.id === sourceId
            ? { ...i, depth: proj.depth, parentId: proj.parentId }
            : i,
        );
      });
    },
    [],
  );

  const handleDragMove = useCallback(
    (event: { operation: { transform: { x: number } } }) => {
      const activeId = activeIdRef.current;
      if (!activeId) return;

      setItems((prev) => {
        const proj = getProjection(
          prev,
          activeId,
          event.operation.transform.x,
          initialDepthRef.current,
        );
        const active = prev.find((i) => i.id === activeId);
        if (
          !active ||
          (active.depth === proj.depth && active.parentId === proj.parentId)
        ) {
          return prev;
        }
        return prev.map((i) =>
          i.id === activeId
            ? { ...i, depth: proj.depth, parentId: proj.parentId }
            : i,
        );
      });
    },
    [],
  );

  const handleDragEnd = useCallback(
    (event: Parameters<NonNullable<DragEndEvent>>[0]) => {
      const { canceled } = event;

      if (canceled) {
        setItems(flattenLayout(navLayout));
      } else {
        setItems((prev) => {
          let finalItems = [...prev];

          // Re-insert section descendants
          if (descendantsRef.current.length > 0 && activeIdRef.current) {
            const sectionIdx = finalItems.findIndex(
              (i) => i.id === activeIdRef.current,
            );
            if (sectionIdx !== -1) {
              finalItems.splice(sectionIdx + 1, 0, ...descendantsRef.current);
            }
          }

          const newLayout = buildLayout(finalItems);
          updateNavLayout(newLayout);
          return finalItems;
        });
      }

      activeIdRef.current = null;

      descendantsRef.current = [];
      initialDepthRef.current = 0;
      setActiveId(null);
    },
    [navLayout, updateNavLayout],
  );

  // --- Layout mutations (non-drag) ---
  const removeItem = useCallback(
    (path: string) => {
      const newLayout = navLayout
        .map((entry) => {
          if (entry.type === "item") {
            return entry.path === path ? null : entry;
          }
          return {
            ...entry,
            children: entry.children.filter((c) => c.path !== path),
          };
        })
        .filter(Boolean) as typeof navLayout;
      updateNavLayout(newLayout);
    },
    [navLayout, updateNavLayout],
  );

  const addItem = useCallback(
    (path: string) => {
      updateNavLayout([...navLayout, { type: "item", path }]);
    },
    [navLayout, updateNavLayout],
  );

  const deleteSection = useCallback(
    (sectionId: string) => {
      updateNavLayout(
        navLayout.filter((e) => !(e.type === "section" && e.id === sectionId)),
      );
    },
    [navLayout, updateNavLayout],
  );

  // --- Section modal ---
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [sectionName, setSectionName] = useState("");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

  const addSection = useCallback(() => {
    if (!sectionName.trim()) return;
    const id = nextSectionId();
    updateNavLayout([
      ...navLayout,
      { type: "section", id, label: sectionName.trim(), children: [] },
    ]);
    setSectionName("");
    setSectionModalOpen(false);
  }, [sectionName, navLayout, updateNavLayout]);

  const saveEditSection = useCallback(() => {
    if (!editingSectionId || !sectionName.trim()) return;
    updateNavLayout(
      navLayout.map((e) =>
        e.type === "section" && e.id === editingSectionId
          ? { ...e, label: sectionName.trim() }
          : e,
      ),
    );
    setEditingSectionId(null);
    setSectionName("");
    setSectionModalOpen(false);
  }, [editingSectionId, sectionName, navLayout, updateNavLayout]);

  return (
    <>
      <Title headingLevel="h1" style={{ marginBottom: 16 }}>
        Marketplace
      </Title>

      <Flex
        gap={{ default: "gapLg" }}
        alignItems={{ default: "alignItemsFlexStart" }}
      >
        {/* --- Navigation Layout Editor --- */}
        <FlexItem style={{ flex: 1, minWidth: 0 }}>
          <Flex
            justifyContent={{ default: "justifyContentSpaceBetween" }}
            alignItems={{ default: "alignItemsCenter" }}
            style={{ marginBottom: 12 }}
          >
            <FlexItem>
              <Title headingLevel="h2">Navigation Layout</Title>
            </FlexItem>
            <FlexItem>
              <Button
                variant="secondary"
                size="sm"
                icon={<PlusCircleIcon />}
                onClick={() => {
                  setEditingSectionId(null);
                  setSectionName("");
                  setSectionModalOpen(true);
                }}
              >
                Add Section
              </Button>
            </FlexItem>
          </Flex>

          <DragDropProvider
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
          >
            <ul style={{ padding: 0, margin: 0 }}>
              {items.map((node, index) => (
                <TreeItem
                  key={node.id}
                  node={node}
                  index={index}
                  label={getLabel(node)}
                  isDisabled={
                    node.kind === "item" && !availablePaths.has(node.path!)
                  }
                  onRemove={
                    node.kind === "item"
                      ? () => removeItem(node.path!)
                      : undefined
                  }
                  onEditSection={
                    node.kind === "section"
                      ? () => {
                          setEditingSectionId(node.id);
                          setSectionName(node.label || "");
                          setSectionModalOpen(true);
                        }
                      : undefined
                  }
                  onDeleteSection={
                    node.kind === "section"
                      ? () => deleteSection(node.id)
                      : undefined
                  }
                />
              ))}
            </ul>

            <DragOverlay>
              {activeNode ? (
                <TreeItemOverlay
                  label={getLabel(activeNode)}
                  isSection={activeNode.kind === "section"}
                  descendantCount={descendantsRef.current.length}
                />
              ) : null}
            </DragOverlay>
          </DragDropProvider>

          {items.length === 0 && (
            <div
              style={{
                padding: "24px 0",
                textAlign: "center",
                color: "var(--pf-t--global--text--color--subtle)",
                fontStyle: "italic",
              }}
            >
              No items in layout. Add extensions from the right.
            </div>
          )}
        </FlexItem>

        {/* --- Available Extensions --- */}
        {availableExtensions.length > 0 && (
          <FlexItem style={{ flex: 1, minWidth: 0 }}>
            <Title headingLevel="h2" style={{ marginBottom: 12 }}>
              Available Extensions
            </Title>
            <ul style={{ padding: 0, margin: 0 }}>
              {availableExtensions.map((ext) => (
                <li
                  key={ext.properties.path}
                  style={{ listStyle: "none", marginBottom: 2 }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 12px",
                      background:
                        "var(--pf-t--global--background--color--secondary--default)",
                      borderRadius: 6,
                    }}
                  >
                    <span style={{ flex: 1, fontWeight: 500 }}>
                      {ext.properties.label}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--pf-t--global--text--color--subtle)",
                      }}
                    >
                      /{ext.properties.path}
                    </span>
                    <Button
                      variant="plain"
                      size="sm"
                      aria-label={`Add ${ext.properties.label}`}
                      onClick={() => addItem(ext.properties.path)}
                      icon={<PlusIcon />}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </FlexItem>
        )}
      </Flex>

      {/* Section name modal */}
      <Modal
        isOpen={sectionModalOpen}
        onClose={() => {
          setSectionModalOpen(false);
          setEditingSectionId(null);
        }}
        variant="small"
      >
        <ModalHeader
          title={editingSectionId ? "Edit Section" : "Add Section"}
        />
        <ModalBody>
          <TextInput
            aria-label="Section name"
            value={sectionName}
            onChange={(_e, val) => setSectionName(val)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (editingSectionId) saveEditSection();
                else addSection();
              }
            }}
          />
        </ModalBody>
        <ModalFooter>
          <Button
            variant="primary"
            onClick={editingSectionId ? saveEditSection : addSection}
            isDisabled={!sectionName.trim()}
          >
            {editingSectionId ? "Save" : "Add"}
          </Button>
          <Button
            variant="link"
            onClick={() => {
              setSectionModalOpen(false);
              setEditingSectionId(null);
            }}
          >
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};
