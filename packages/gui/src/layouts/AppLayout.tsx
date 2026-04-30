import { useState, useCallback, useMemo } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import {
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
  MoonIcon,
  SunIcon,
} from "@patternfly/react-icons";
import { useAuth } from "../contexts/AuthContext";
import { useAppConfig } from "../contexts/AppConfigContext";
import type { PluginPage } from "../contexts/AppConfigContext";
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

  const pageMap = useMemo(() => {
    const map = new Map<string, PluginPage>();
    for (const page of pluginPages) {
      map.set(page.id, page);
    }
    return map;
  }, [pluginPages]);

  const navItems = useMemo(() => {
    const items: PluginPage[] = [];
    for (const entry of navLayout) {
      if (entry.type === "page") {
        const page = pageMap.get(entry.pageId);
        if (page) items.push(page);
      }
    }
    return items;
  }, [navLayout, pageMap]);

  return (
    <Nav>
      <NavList>
        {navItems.map((page) => {
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
