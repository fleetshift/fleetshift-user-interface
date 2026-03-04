import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardTitle,
  FormGroup,
  FormHelperText,
  Gallery,
  HelperText,
  HelperTextItem,
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
import {
  PlusCircleIcon,
  TrashIcon,
  ThumbtackIcon,
} from "@patternfly/react-icons";
import { useUserPreferences } from "../../contexts/UserPreferencesContext";
import { validatePagePath } from "../../utils/extensions";
import "./CanvasPageListPage.scss";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const CanvasPageListPage = () => {
  const {
    canvasPages,
    createPage,
    deletePage,
    isPageInNav,
    togglePageInNav,
  } = useUserPreferences();
  const navigate = useNavigate();

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
        className="pf-v6-u-mb-md"
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
            <Card
              key={page.id}
              isClickable
              isSelectable
              onClick={() => navigate(`/${page.path}`)}
              className="fs-page-card"
            >
              <CardTitle>{page.title}</CardTitle>
              <CardBody>
                <div>
                  {page.modules.length === 0
                    ? "Empty canvas"
                    : `${page.modules.length} module${page.modules.length === 1 ? "" : "s"}`}
                </div>
                <div className="fs-page-card__path">/{page.path}</div>
              </CardBody>
              <CardFooter>
                <Flex gap={{ default: "gapMd" }}>
                  <FlexItem>
                    <Button
                      variant="link"
                      icon={<ThumbtackIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePageInNav(page.id);
                      }}
                    >
                      {isPageInNav(page.id) ? "Unpin from nav" : "Pin to nav"}
                    </Button>
                  </FlexItem>
                  <FlexItem>
                    <Button
                      variant="link"
                      isDanger
                      icon={<TrashIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePage(page.id);
                      }}
                    >
                      Delete
                    </Button>
                  </FlexItem>
                </Flex>
              </CardFooter>
            </Card>
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
