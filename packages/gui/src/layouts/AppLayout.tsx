import { useState, useCallback, useMemo } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import {
  Divider,
  Masthead,
  MastheadBrand,
  MastheadContent,
  MastheadLogo,
  MastheadMain,
  MastheadToggle,
  Nav,
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
} from "@patternfly/react-core";
import {
  BarsIcon,
  BugIcon,
  KeyIcon,
  MoonIcon,
  SunIcon,
} from "@patternfly/react-icons";
import { useAuth } from "../contexts/AuthContext";
import { useAppConfig } from "../contexts/AppConfigContext";
import type { PluginPage } from "../contexts/AppConfigContext";
import { ClusterSwitcher } from "./ClusterSwitcher";
import logo from "../assets/masthead.png";
import "./AppLayout.scss";

const UserSwitcher = () => {
  const { user, logout } = useAuth();

  return (
    <ToolbarGroup>
      <ToolbarItem>{user?.display_name ?? user?.username}</ToolbarItem>
      <ToolbarItem>
        <Button variant="link" onClick={logout}>
          Log out
        </Button>
      </ToolbarItem>
    </ToolbarGroup>
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
              <Button
                variant="plain"
                aria-label="Debug"
                component={(props) => <Link to="/debug" {...props} />}
              >
                <BugIcon />
              </Button>
            </ToolbarItem>
            <ToolbarItem>
              <DarkModeToggle />
            </ToolbarItem>
          </ToolbarGroup>
        </ToolbarContent>
      </Toolbar>
    </MastheadContent>
  </Masthead>
);

const AppNav = () => {
  const location = useLocation();
  const { pluginPages, navLayout } = useAppConfig();

  // Build a lookup from page ID to plugin page definition
  const pageMap = useMemo(() => {
    const map = new Map<string, PluginPage>();
    for (const page of pluginPages) {
      map.set(page.id, page);
    }
    return map;
  }, [pluginPages]);

  // Build ordered nav items from the user's nav layout, split by section
  const { clusterItems, controlPlaneItems } = useMemo(() => {
    const cluster: PluginPage[] = [];
    const controlPlane: PluginPage[] = [];
    for (const entry of navLayout) {
      if (entry.type === "page") {
        const page = pageMap.get(entry.pageId);
        if (page) {
          if (page.pluginKey === "management") {
            controlPlane.push(page);
          } else {
            cluster.push(page);
          }
        }
      }
    }
    return { clusterItems: cluster, controlPlaneItems: controlPlane };
  }, [navLayout, pageMap]);

  return (
    <Nav>
      <NavList>
        {/* Built-in items */}
        <NavItem isActive={location.pathname === "/"}>
          <Link to="/">Dashboard</Link>
        </NavItem>
        <NavItem
          isActive={
            location.pathname === "/clusters" ||
            location.pathname.startsWith("/clusters/")
          }
        >
          <Link to="/clusters">Clusters</Link>
        </NavItem>

        {clusterItems.length > 0 && <Divider component="li" />}

        {/* Cluster-scoped plugin nav items */}
        {clusterItems.map((page) => {
          const fullPath = `/${page.path}`;
          return (
            <NavItem
              key={page.id}
              isActive={
                location.pathname === fullPath ||
                location.pathname.startsWith(fullPath + "/")
              }
            >
              <Link to={fullPath}>{page.title}</Link>
            </NavItem>
          );
        })}

        {/* Control Plane section */}
        <Divider component="li" />
        <li
          className="pf-v6-c-nav__item"
          style={{
            fontSize: "var(--pf-t--global--font--size--xs)",
            color: "var(--pf-t--global--text--color--subtle)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            padding:
              "var(--pf-t--global--spacer--sm) var(--pf-t--global--spacer--md)",
            fontWeight:
              "var(--pf-t--global--font--weight--heading--default)",
            cursor: "default",
          }}
        >
          Control Plane
        </li>
        {controlPlaneItems.map((page) => {
          const fullPath = `/${page.path}`;
          return (
            <NavItem
              key={page.id}
              isActive={
                location.pathname === fullPath ||
                location.pathname.startsWith(fullPath + "/")
              }
            >
              <Link to={fullPath}>{page.title}</Link>
            </NavItem>
          );
        })}

        <Divider component="li" />

        <NavItem isActive={location.pathname === "/grant-access"}>
          <Link to="/grant-access">
            <KeyIcon /> Grant Access
          </Link>
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

export const AppLayout = () => (
  <Page masthead={<AppMasthead />} sidebar={<Sidebar />} isManagedSidebar>
    <PageSection isFilled hasOverflowScroll>
      <Outlet />
    </PageSection>
  </Page>
);
