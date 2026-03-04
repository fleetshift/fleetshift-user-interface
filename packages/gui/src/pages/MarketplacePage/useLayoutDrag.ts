import { useState, useCallback, useRef } from "react";
import type { DragStartEvent, DragEndEvent } from "@dnd-kit/react";
import type { NavLayoutEntry } from "../../utils/extensions";
import {
  flattenLayout,
  buildLayout,
  getProjection,
  getDescendantIds,
  arrayMove,
} from "../../components/NavLayoutTree/utilities";
import type { FlatNode } from "../../components/NavLayoutTree/utilities";

function isAvailablePageDrag(sourceId: string | number): boolean {
  return String(sourceId).startsWith("avail-");
}

export function useLayoutDrag(
  navLayout: NavLayoutEntry[],
  updateNavLayout: (layout: NavLayoutEntry[]) => void,
) {
  const [items, setItems] = useState<FlatNode[]>(() =>
    flattenLayout(navLayout),
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const initialDepthRef = useRef(0);
  const descendantsRef = useRef<FlatNode[]>([]);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const dropTargetRef = useRef<string | null>(null);
  const [activeAvailableTitle, setActiveAvailableTitle] = useState<
    string | null
  >(null);

  const activeNode = activeId ? items.find((i) => i.id === activeId) : null;

  // Sync items when navLayout changes from outside
  const syncItems = useCallback(
    (layout: NavLayoutEntry[]) => setItems(flattenLayout(layout)),
    [],
  );

  const handleDragStart = useCallback(
    (event: Parameters<NonNullable<DragStartEvent>>[0]) => {
      const { source } = event.operation;
      if (!source) return;
      const id = String(source.id);

      if (isAvailablePageDrag(id)) {
        activeIdRef.current = id;
        setActiveId(id);
        const data = source.data as
          | { type: string; title?: string }
          | undefined;
        setActiveAvailableTitle(data?.title ?? null);
        return;
      }

      activeIdRef.current = id;
      setActiveId(id);

      const node = items.find((i) => i.id === id);
      if (!node) return;

      initialDepthRef.current = node.depth;

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

      // Available page drag — just track the drop target, don't reorder
      if (isAvailablePageDrag(sourceId)) {
        dropTargetRef.current = targetId;
        setDropTargetId(targetId);
        return;
      }

      setItems((prev) => {
        const sourceIdx = prev.findIndex((i) => i.id === sourceId);
        const targetIdx = prev.findIndex((i) => i.id === targetId);
        if (sourceIdx === -1 || targetIdx === -1) return prev;

        const reordered = arrayMove(prev, sourceIdx, targetIdx);
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
      const id = activeIdRef.current;
      if (!id || isAvailablePageDrag(id)) return;

      setItems((prev) => {
        const proj = getProjection(
          prev,
          id,
          event.operation.transform.x,
          initialDepthRef.current,
        );
        const active = prev.find((i) => i.id === id);
        if (
          !active ||
          (active.depth === proj.depth && active.parentId === proj.parentId)
        ) {
          return prev;
        }
        return prev.map((i) =>
          i.id === id
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
      const currentActiveId = activeIdRef.current;

      // Handle available page drop
      if (currentActiveId && isAvailablePageDrag(currentActiveId)) {
        if (!canceled) {
          const data = event.operation.source?.data as
            | { type: string; pageId?: string }
            | undefined;
          const pageId = data?.pageId;

          if (pageId) {
            const targetId = dropTargetRef.current;
            const newNode: FlatNode = {
              id: pageId,
              kind: "page",
              depth: 0,
              parentId: null,
              pageId,
            };

            setItems((prev) => {
              let finalItems: FlatNode[];

              if (!targetId) {
                // No target — append at end
                finalItems = [...prev, newNode];
              } else {
                const targetIdx = prev.findIndex((i) => i.id === targetId);
                if (targetIdx === -1) {
                  finalItems = [...prev, newNode];
                } else {
                  const target = prev[targetIdx];

                  if (target.kind === "section") {
                    // Drop on section → insert as its first child
                    newNode.depth = 1;
                    newNode.parentId = target.id;
                    finalItems = [...prev];
                    finalItems.splice(targetIdx + 1, 0, newNode);
                  } else if (target.depth === 1 && target.parentId) {
                    // Drop on a page inside a section → insert after it in the same section
                    newNode.depth = 1;
                    newNode.parentId = target.parentId;
                    finalItems = [...prev];
                    finalItems.splice(targetIdx + 1, 0, newNode);
                  } else {
                    // Drop on a top-level page → insert after it at root level
                    finalItems = [...prev];
                    finalItems.splice(targetIdx + 1, 0, newNode);
                  }
                }
              }

              const newLayout = buildLayout(finalItems);
              updateNavLayout(newLayout);
              return finalItems;
            });
          }
        }

        activeIdRef.current = null;
        dropTargetRef.current = null;
        setDropTargetId(null);
        setActiveId(null);
        setActiveAvailableTitle(null);
        return;
      }

      // Normal tree drag end
      if (canceled) {
        setItems(flattenLayout(navLayout));
      } else {
        setItems((prev) => {
          let finalItems = [...prev];

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

  return {
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
  };
}
