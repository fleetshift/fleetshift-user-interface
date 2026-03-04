import { useState, useCallback, useMemo, useEffect } from "react";
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
import { GripVerticalIcon, PlusCircleIcon } from "@patternfly/react-icons";
import { DragDropProvider, DragOverlay, useDroppable } from "@dnd-kit/react";
import { isPageInLayout } from "../../utils/extensions";
import { useUserPreferences } from "../../contexts/UserPreferencesContext";
import {
  TreeItem,
  TreeItemOverlay,
} from "../../components/NavLayoutTree/TreeItem";
import { AvailablePageItem } from "./AvailablePageItem";
import { useLayoutDrag } from "./useLayoutDrag";
import "./MarketplacePage.scss";

let sectionIdCounter = 0;
function nextSectionId(): string {
  return `section-${Date.now()}-${sectionIdCounter++}`;
}

function NavTreeDropZone({
  children,
  isEmpty,
}: {
  children: React.ReactNode;
  isEmpty: boolean;
}) {
  const { ref } = useDroppable({ id: "nav-tree" });

  return (
    <ul
      ref={ref}
      style={{ padding: 0, margin: 0, minHeight: isEmpty ? 60 : undefined }}
    >
      {children}
    </ul>
  );
}

export const MarketplacePage = () => {
  const { navLayout, updateNavLayout, canvasPages, getPage } =
    useUserPreferences();

  const {
    items,
    activeNode,
    activeAvailableTitle,
    dropTargetId,
    descendantsRef,
    syncItems,
    handleDragStart,
    handleDragOver,
    handleDragMove,
    handleDragEnd,
  } = useLayoutDrag(navLayout, updateNavLayout);

  // Sync items when navLayout changes from outside (e.g. user switch)
  useEffect(() => {
    syncItems(navLayout);
  }, [navLayout, syncItems]);

  const getLabel = useCallback(
    (pageId?: string, sectionLabel?: string, kind?: string) => {
      if (kind === "section") return sectionLabel || "Untitled";
      const page = pageId ? getPage(pageId) : undefined;
      return page?.title || "Unknown page";
    },
    [getPage],
  );

  const getPathSlug = useCallback(
    (pageId?: string) => {
      const page = pageId ? getPage(pageId) : undefined;
      return page?.path;
    },
    [getPage],
  );

  // Pages not in nav layout
  const availablePages = useMemo(
    () => canvasPages.filter((p) => !isPageInLayout(navLayout, p.id)),
    [canvasPages, navLayout],
  );

  // --- Layout mutations (non-drag) ---
  const removeItem = useCallback(
    (pageId: string) => {
      const newLayout = navLayout
        .map((entry) => {
          if (entry.type === "page") {
            return entry.pageId === pageId ? null : entry;
          }
          if (entry.type === "section") {
            return {
              ...entry,
              children: entry.children.filter((c) => c.pageId !== pageId),
            };
          }
          return entry;
        })
        .filter(Boolean) as typeof navLayout;
      updateNavLayout(newLayout);
    },
    [navLayout, updateNavLayout],
  );

  const addItem = useCallback(
    (pageId: string) => {
      updateNavLayout([...navLayout, { type: "page", pageId }]);
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
      <Title headingLevel="h1" className="fs-page-header">
        Navigation
      </Title>

      <DragDropProvider
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      >
        <Flex
          gap={{ default: "gapLg" }}
          alignItems={{ default: "alignItemsFlexStart" }}
        >
          {/* --- Navigation Layout Editor --- */}
          <FlexItem className="fs-nav-editor__panel">
            <Flex
              justifyContent={{ default: "justifyContentSpaceBetween" }}
              alignItems={{ default: "alignItemsCenter" }}
              className="pf-v6-u-mb-sm"
            >
              <FlexItem>
                <Title headingLevel="h2">Navigation Layout</Title>
              </FlexItem>
              <FlexItem>
                <Button
                  variant="link"
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

            <NavTreeDropZone isEmpty={items.length === 0}>
              {items.map((node, index) => (
                <TreeItem
                  key={node.id}
                  node={node}
                  index={index}
                  label={getLabel(node.pageId, node.label, node.kind)}
                  pathSlug={getPathSlug(node.pageId)}
                  isDropTarget={dropTargetId === node.id}
                  onRemove={
                    node.kind === "page"
                      ? () => removeItem(node.pageId!)
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
            </NavTreeDropZone>

            {items.length === 0 && (
              <div className="fs-nav-editor__empty">
                No items in layout. Add pages from the right.
              </div>
            )}
          </FlexItem>

          {/* --- Available Pages --- */}
          {availablePages.length > 0 && (
            <FlexItem className="fs-nav-editor__panel">
              <Title headingLevel="h2" className="pf-v6-u-mb-sm">
                Available Pages
              </Title>
              <ul style={{ padding: 0, margin: 0 }}>
                {availablePages.map((page) => (
                  <AvailablePageItem
                    key={page.id}
                    page={page}
                    onAdd={addItem}
                  />
                ))}
              </ul>
            </FlexItem>
          )}
        </Flex>

        <DragOverlay>
          {activeNode ? (
            <TreeItemOverlay
              label={getLabel(
                activeNode.pageId,
                activeNode.label,
                activeNode.kind,
              )}
              isSection={activeNode.kind === "section"}
              descendantCount={descendantsRef.current.length}
            />
          ) : activeAvailableTitle ? (
            <div className="fs-tree-overlay fs-tree-overlay--page">
              <GripVerticalIcon className="pf-v6-u-icon-color-subtle" />
              <span className="fs-tree-overlay__label fs-tree-overlay__label--page">
                {activeAvailableTitle}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DragDropProvider>

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
