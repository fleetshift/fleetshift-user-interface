import { useDraggable } from "@dnd-kit/react";
import { GripVerticalIcon, PlusIcon } from "@patternfly/react-icons";
import { Button } from "@patternfly/react-core";
import type { CanvasPage } from "../../utils/extensions";

interface AvailablePageItemProps {
  page: CanvasPage;
  onAdd: (pageId: string) => void;
}

export function AvailablePageItem({ page, onAdd }: AvailablePageItemProps) {
  const { ref, handleRef, isDragSource } = useDraggable({
    id: `avail-${page.id}`,
    data: { type: "available-page", pageId: page.id, title: page.title },
  });

  return (
    <li
      ref={ref}
      style={{
        listStyle: "none",
        marginBottom: 4,
        opacity: isDragSource ? 0.4 : 1,
      }}
    >
      <div className="fs-available-page">
        <span ref={handleRef} className="fs-available-page__handle">
          <GripVerticalIcon className="pf-v6-u-icon-color-subtle" />
        </span>
        <span className="fs-available-page__title">{page.title}</span>
        <span className="fs-available-page__path">/{page.path}</span>
        <Button
          variant="link"
          size="sm"
          icon={<PlusIcon />}
          onClick={() => onAdd(page.id)}
        >
          Add
        </Button>
      </div>
    </li>
  );
}
