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

interface TreeItemProps {
  node: FlatNode;
  index: number;
  label: string;
  isDisabled?: boolean;
  onRemove?: () => void;
  onEditSection?: () => void;
  onDeleteSection?: () => void;
}

export function TreeItem({
  node,
  index,
  label,
  isDisabled,
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

  return (
    <li
      ref={ref}
      style={{
        listStyle: "none",
        marginLeft: node.depth * INDENTATION,
        opacity: isDragSource ? 0.4 : 1,
        marginBottom: 2,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 12px",
          background: isSection
            ? "var(--pf-t--global--background--color--primary--default)"
            : "var(--pf-t--global--background--color--secondary--default)",
          borderRadius: 6,
          border: isSection
            ? "1px solid var(--pf-t--global--border--color--default)"
            : "none",
        }}
      >
        <span
          ref={handleRef}
          style={{
            cursor: "grab",
            display: "flex",
            alignItems: "center",
          }}
        >
          <GripVerticalIcon
            color="var(--pf-t--global--icon--color--subtle)"
          />
        </span>

        <span
          style={{
            flex: 1,
            fontWeight: isSection ? 600 : 500,
            opacity: isDisabled ? 0.6 : 1,
          }}
        >
          {label}
        </span>

        {!isSection && isDisabled && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--pf-t--global--color--status--danger--default)",
              background: "rgba(201, 25, 11, 0.1)",
              padding: "2px 8px",
              borderRadius: 10,
              whiteSpace: "nowrap",
            }}
          >
            Plugin unavailable
          </span>
        )}

        {!isSection && node.path && (
          <span
            style={{
              fontSize: 12,
              color: "var(--pf-t--global--text--color--subtle)",
            }}
          >
            /{node.path}
          </span>
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
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        background: isSection
          ? "var(--pf-t--global--background--color--primary--default)"
          : "var(--pf-t--global--background--color--secondary--default)",
        borderRadius: 6,
        border: "1px solid var(--pf-t--global--border--color--default)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        width: "min-content",
        whiteSpace: "nowrap",
      }}
    >
      <GripVerticalIcon color="var(--pf-t--global--icon--color--subtle)" />
      <span style={{ fontWeight: isSection ? 600 : 500 }}>{label}</span>
      {descendantCount > 0 && (
        <span
          style={{
            background: "var(--pf-t--global--color--brand--default)",
            color: "#fff",
            borderRadius: "50%",
            width: 20,
            height: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {descendantCount}
        </span>
      )}
    </div>
  );
}
