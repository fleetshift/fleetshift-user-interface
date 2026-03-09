import { useState, useCallback } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import {
  Drawer,
  DrawerActions,
  DrawerCloseButton,
  DrawerContent,
  DrawerContentBody,
  DrawerHead,
  DrawerPanelContent,
  Masthead,
  MastheadBrand,
  MastheadContent,
  MastheadLogo,
  MastheadMain,
  MastheadToggle,
  Nav,
  NavExpandable,
  NavItem,
  NavList,
  Page,
  PageSection,
  PageSidebar,
  PageSidebarBody,
  PageToggleButton,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  Button,
  Divider,
  ToggleGroup,
  ToggleGroupItem,
} from "@patternfly/react-core";
import { BarsIcon, CogIcon, MoonIcon, SunIcon } from "@patternfly/react-icons";
import { useAuth } from "../contexts/AuthContext";
import { useUserPreferences } from "../contexts/UserPreferencesContext";
import { useDrawer, DrawerProvider } from "../contexts/DrawerContext";
import { ClusterSwitcher } from "./ClusterSwitcher";
import { ClusterManagerDrawerContent } from "../pages/ClusterListPage/ClusterManagerDrawerContent";
import logo from "../assets/masthead.png";

const UserSwitcher = () => {
  const { user, switchUser } = useAuth();

  return (
    <ToggleGroup>
      <ToggleGroupItem
        text="Ops"
        isSelected={user?.role === "ops"}
        onChange={() => switchUser("ops")}
      />
      <ToggleGroupItem
        text="Dev"
        isSelected={user?.role === "dev"}
        onChange={() => switchUser("dev")}
      />
    </ToggleGroup>
  );
};

const DARK_MODE_KEY = "fleetshift_dark_mode";
const DARK_CLASS = "pf-v6-theme-dark";

function initDarkMode(): boolean {
  const stored = localStorage.getItem(DARK_MODE_KEY);
  const isDark = stored === "true";
  if (isDark) {
    document.documentElement.classList.add(DARK_CLASS);
  }
  return isDark;
}

const DarkModeToggle = () => {
  const [dark, setDark] = useState(initDarkMode);

  const toggle = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle(DARK_CLASS, next);
      localStorage.setItem(DARK_MODE_KEY, String(next));
      return next;
    });
  }, []);

  return (
    <Button variant="plain" aria-label="Toggle dark mode" onClick={toggle}>
      {dark ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
};

const ClusterManagerButton = () => {
  const { openDrawer } = useDrawer();
  return (
    <Button
      variant="plain"
      aria-label="Cluster manager"
      onClick={() => openDrawer(<ClusterManagerDrawerContent />)}
    >
      <CogIcon />
    </Button>
  );
};

const AppMasthead = () => (
  <Masthead>
    <MastheadMain>
      <MastheadToggle>
        <PageToggleButton aria-label="Navigation toggle">
          <BarsIcon />
        </PageToggleButton>
      </MastheadToggle>
      <MastheadBrand>
        <MastheadLogo component="a" href="/">
          <img
            src={logo}
            alt="FleetShift"
            className="fs-masthead-logo"
            style={{ height: 36 }}
          />
        </MastheadLogo>
      </MastheadBrand>
    </MastheadMain>
    <MastheadContent>
      <Toolbar>
        <ToolbarContent>
          <ToolbarItem>
            <ClusterSwitcher />
          </ToolbarItem>
          <ToolbarItem>
            <UserSwitcher />
          </ToolbarItem>
          <ToolbarGroup align={{ default: "alignEnd" }}>
            <ToolbarItem>
              <DarkModeToggle />
            </ToolbarItem>
            <ToolbarItem>
              <ClusterManagerButton />
            </ToolbarItem>
          </ToolbarGroup>
        </ToolbarContent>
      </Toolbar>
    </MastheadContent>
  </Masthead>
);

const AppNav = () => {
  const location = useLocation();
  const { navLayout, getPage } = useUserPreferences();

  const renderPageNavItem = (pageId: string) => {
    const page = getPage(pageId);
    if (!page) return null;
    const fullPath = `/${page.path}`;
    return (
      <NavItem
        key={pageId}
        isActive={
          location.pathname === fullPath ||
          location.pathname.startsWith(fullPath + "/")
        }
      >
        <Link to={fullPath}>{page.title}</Link>
      </NavItem>
    );
  };

  const layoutEntries: React.ReactNode[] = [];
  for (const entry of navLayout) {
    if (entry.type === "page") {
      const node = renderPageNavItem(entry.pageId);
      if (node) layoutEntries.push(node);
    } else if (entry.type === "section") {
      const children = entry.children
        .map((child) => renderPageNavItem(child.pageId))
        .filter(Boolean);
      if (children.length > 0) {
        const isActive = entry.children.some((child) => {
          const page = getPage(child.pageId);
          if (!page) return false;
          const fp = `/${page.path}`;
          return (
            location.pathname === fp || location.pathname.startsWith(fp + "/")
          );
        });
        layoutEntries.push(
          <NavExpandable
            key={entry.id}
            title={entry.label}
            isActive={isActive}
            isExpanded={isActive}
          >
            {children}
          </NavExpandable>,
        );
      }
    }
  }

  return (
    <Nav>
      <NavList>
        <NavItem isActive={location.pathname === "/"}>
          <Link to="/">Dashboard</Link>
        </NavItem>
        <NavItem isActive={location.pathname === "/clusters"}>
          <Link to="/clusters">Clusters</Link>
        </NavItem>
        {layoutEntries.length > 0 && <Divider component="li" />}
        {layoutEntries}
        <Divider component="li" />
        <NavItem isActive={location.pathname === "/navigation"}>
          <Link to="/navigation">Navigation</Link>
        </NavItem>
        <NavItem isActive={location.pathname.startsWith("/pages")}>
          <Link to="/pages">Composer</Link>
        </NavItem>
      </NavList>
    </Nav>
  );
};

const Sidebar = () => (
  <PageSidebar>
    <PageSidebarBody>
      <AppNav />
    </PageSidebarBody>
  </PageSidebar>
);

const AppDrawer = () => {
  const { isOpen, content, closeDrawer } = useDrawer();

  const panelContent = (
    <DrawerPanelContent widths={{ default: "width_33" }}>
      <DrawerHead>
        <DrawerActions>
          <DrawerCloseButton onClick={closeDrawer} />
        </DrawerActions>
      </DrawerHead>
      {content}
    </DrawerPanelContent>
  );

  return (
    <Page masthead={<AppMasthead />} sidebar={<Sidebar />} isManagedSidebar>
      <Drawer
        isExpanded={isOpen}
        onExpand={() => {}}
        position="end"
        isInline
        style={{ flex: 1 }}
      >
        <DrawerContent panelContent={panelContent}>
          <DrawerContentBody hasPadding={false}>
            <PageSection isFilled hasOverflowScroll>
              <Outlet />
            </PageSection>
          </DrawerContentBody>
        </DrawerContent>
      </Drawer>
    </Page>
  );
};

export const AppLayout = () => (
  <DrawerProvider>
    <AppDrawer />
  </DrawerProvider>
);
