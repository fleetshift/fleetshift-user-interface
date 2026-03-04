import { useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  Dropdown,
  DropdownItem,
  DropdownList,
  FormGroup,
  FormHelperText,
  Gallery,
  HelperText,
  HelperTextItem,
  MenuToggle,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextInput,
  Title,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
} from "@patternfly/react-core";
import { EllipsisVIcon, PlusCircleIcon } from "@patternfly/react-icons";
import { useUserPreferences } from "../../contexts/UserPreferencesContext";
import { useClusters } from "../../contexts/ClusterContext";
import { pluginKeyFromName, validatePagePath } from "../../utils/extensions";
import type { CanvasPage } from "../../utils/extensions";
import "./CanvasPageListPage.scss";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Check if any module in a page has its plugin available on at least one cluster */
function usePageAvailability() {
  const { installed } = useClusters();

  return useCallback(
    (page: CanvasPage): boolean => {
      if (page.modules.length === 0) return true; // empty pages are always "available"
      return page.modules.some((mod) => {
        const pluginKey = pluginKeyFromName(mod.moduleRef.scope);
        return installed.some((c) => c.plugins.includes(pluginKey));
      });
    },
    [installed],
  );
}

function PageCard({
  page,
  isAvailable,
  onNavigate,
  onDelete,
}: {
  page: CanvasPage;
  isAvailable: boolean;
  onNavigate: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  return (
    <Card
      isClickable
      isSelectable
      isDisabled={!isAvailable}
      className="fs-page-card"
    >
      <CardHeader
        actions={{
          actions: (
            <Dropdown
              isOpen={menuOpen}
              onSelect={() => setMenuOpen(false)}
              onOpenChange={setMenuOpen}
              toggle={{
                toggleRef,
                toggleNode: (
                  <MenuToggle
                    ref={toggleRef}
                    variant="plain"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen((prev) => !prev);
                    }}
                    isExpanded={menuOpen}
                    aria-label="Page actions"
                  >
                    <EllipsisVIcon />
                  </MenuToggle>
                ),
              }}
            >
              <DropdownList>
                <DropdownItem
                  key="delete"
                  isDanger
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  Delete page
                </DropdownItem>
              </DropdownList>
            </Dropdown>
          ),
          hasNoOffset: true,
        }}
        selectableActions={{
          onClickAction: onNavigate,
          selectableActionAriaLabel: `Navigate to ${page.title}`,
          isHidden: true,
        }}
      >
        <CardTitle>{page.title}</CardTitle>
      </CardHeader>
      <CardBody>
        <div className="fs-page-card__count">{page.modules.length}</div>
        <div className="fs-page-card__count-label">
          {page.modules.length === 1 ? "module" : "modules"}
        </div>
        <div className="fs-page-card__path">/{page.path}</div>
      </CardBody>
      {!isAvailable && (
        <CardFooter>
          <span className="fs-page-card__unavailable">Plugins unavailable</span>
        </CardFooter>
      )}
    </Card>
  );
}

export const CanvasPageListPage = () => {
  const { canvasPages, createPage, deletePage } = useUserPreferences();
  const navigate = useNavigate();
  const isPageAvailable = usePageAvailability();

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [path, setPath] = useState("");
  const [pathTouched, setPathTouched] = useState(false);

  const pathError = useMemo(
    () => (path ? validatePagePath(path, canvasPages) : null),
    [path, canvasPages],
  );

  const handleTitleChange = useCallback(
    (_e: unknown, val: string) => {
      setTitle(val);
      if (!pathTouched) {
        setPath(slugify(val));
      }
    },
    [pathTouched],
  );

  const handlePathChange = useCallback((_e: unknown, val: string) => {
    setPathTouched(true);
    setPath(val);
  }, []);

  const handleCreate = useCallback(async () => {
    if (!title.trim() || !path || pathError) return;
    const page = await createPage(title.trim(), path);
    setTitle("");
    setPath("");
    setPathTouched(false);
    setModalOpen(false);
    navigate(`/${page.path}`);
  }, [title, path, pathError, createPage, navigate]);

  const handleClose = useCallback(() => {
    setModalOpen(false);
    setTitle("");
    setPath("");
    setPathTouched(false);
  }, []);

  return (
    <>
      <Flex
        justifyContent={{ default: "justifyContentSpaceBetween" }}
        alignItems={{ default: "alignItemsCenter" }}
        className="fs-page-header"
      >
        <FlexItem>
          <Title headingLevel="h1">Composer</Title>
        </FlexItem>
        <FlexItem>
          <Button
            variant="primary"
            icon={<PlusCircleIcon />}
            onClick={() => setModalOpen(true)}
          >
            Create Page
          </Button>
        </FlexItem>
      </Flex>

      {canvasPages.length === 0 ? (
        <EmptyState titleText="No composed pages yet" headingLevel="h2">
          <EmptyStateBody>
            Create a page to start composing plugin modules on a grid canvas.
          </EmptyStateBody>
        </EmptyState>
      ) : (
        <Gallery hasGutter minWidths={{ default: "280px" }}>
          {canvasPages.map((page) => (
            <PageCard
              key={page.id}
              page={page}
              isAvailable={isPageAvailable(page)}
              onNavigate={() => navigate(`/${page.path}`)}
              onDelete={() => deletePage(page.id)}
            />
          ))}
        </Gallery>
      )}

      <Modal isOpen={modalOpen} onClose={handleClose} variant="small">
        <ModalHeader title="Create Page" />
        <ModalBody>
          <FormGroup label="Title" isRequired fieldId="page-title">
            <TextInput
              id="page-title"
              aria-label="Page title"
              placeholder="My Dashboard"
              value={title}
              onChange={handleTitleChange}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
              autoFocus
            />
          </FormGroup>
          <FormGroup
            label="URL Path"
            isRequired
            fieldId="page-path"
            className="pf-v6-u-mt-md"
          >
            <TextInput
              id="page-path"
              aria-label="Page path"
              placeholder="my-dashboard"
              value={path}
              onChange={handlePathChange}
              validated={pathError ? "error" : "default"}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
            />
            {pathError ? (
              <FormHelperText>
                <HelperText>
                  <HelperTextItem variant="error">{pathError}</HelperTextItem>
                </HelperText>
              </FormHelperText>
            ) : path ? (
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    Page will be accessible at /{path}
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            ) : null}
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="primary"
            onClick={handleCreate}
            isDisabled={!title.trim() || !path || !!pathError}
          >
            Create
          </Button>
          <Button variant="link" onClick={handleClose}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};
