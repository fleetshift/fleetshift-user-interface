import { useSortable } from "@dnd-kit/react/sortable";
import {
  GripVerticalIcon,
  TimesIcon,
  PencilAltIcon,
  TrashIcon,
} from "@patternfly/react-icons";
import { Button } from "@patternfly/react-core";
import type { FlatNode } from "./utilities";
import { INDENTATION } from "./utilities";
import "./TreeItem.scss";

interface TreeItemProps {
  node: FlatNode;
  index: number;
  label: string;
  pathSlug?: string;
  isDropTarget?: boolean;
  onRemove?: () => void;
  onEditSection?: () => void;
  onDeleteSection?: () => void;
}

export function TreeItem({
  node,
  index,
  label,
  pathSlug,
  isDropTarget,
  onRemove,
  onEditSection,
  onDeleteSection,
}: TreeItemProps) {
  const { ref, handleRef, isDragSource } = useSortable({
    id: node.id,
    index,
    data: { depth: node.depth, parentId: node.parentId, kind: node.kind },
    transition: { idle: true },
  });

  const isSection = node.kind === "section";
  const kindClass = isSection ? "section" : "page";

  return (
    <li
      ref={ref}
      className={`fs-tree-item ${isDragSource ? "fs-tree-item--dragging" : ""}`}
      style={{ marginLeft: node.depth * INDENTATION }}
    >
      <div
        className={`fs-tree-item__row fs-tree-item__row--${kindClass}${isDropTarget ? " fs-tree-item__row--drop-target" : ""}`}
      >
        <span ref={handleRef} className="fs-tree-item__handle">
          <GripVerticalIcon className="pf-v6-u-icon-color-subtle" />
        </span>

        <span
          className={`fs-tree-item__label fs-tree-item__label--${kindClass}`}
        >
          {label}
        </span>

        {!isSection && pathSlug && (
          <span className="fs-tree-item__path">/{pathSlug}</span>
        )}

        {isSection && (
          <>
            <Button
              variant="plain"
              size="sm"
              aria-label={`Edit ${label}`}
              onClick={onEditSection}
              icon={<PencilAltIcon />}
            />
            <Button
              variant="plain"
              size="sm"
              aria-label={`Delete ${label}`}
              onClick={onDeleteSection}
              icon={<TrashIcon />}
            />
          </>
        )}

        {!isSection && onRemove && (
          <Button
            variant="plain"
            size="sm"
            aria-label={`Remove ${label}`}
            onClick={onRemove}
            icon={<TimesIcon />}
          />
        )}
      </div>
    </li>
  );
}

export function TreeItemOverlay({
  label,
  isSection,
  descendantCount,
}: {
  label: string;
  isSection: boolean;
  descendantCount: number;
}) {
  const kindClass = isSection ? "section" : "page";

  return (
    <div className={`fs-tree-overlay fs-tree-overlay--${kindClass}`}>
      <GripVerticalIcon className="pf-v6-u-icon-color-subtle" />
      <span
        className={`fs-tree-overlay__label fs-tree-overlay__label--${kindClass}`}
      >
        {label}
      </span>
      {descendantCount > 0 && (
        <span className="fs-tree-overlay__badge">{descendantCount}</span>
      )}
    </div>
  );
}
