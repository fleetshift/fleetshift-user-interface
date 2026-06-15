import {
  CORE_EXTENSION_META,
  orderByIds,
  useNavOrder,
} from "@fleetshift/common";
import {
  Divider,
  Dropdown,
  DropdownItem,
  DropdownList,
  Masthead,
  MastheadBrand,
  MastheadContent,
  MastheadLogo,
  MastheadMain,
  MastheadToggle,
  MenuToggle,
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
} from "@patternfly/react-core";
import { BarsIcon, BugIcon } from "@patternfly/react-icons";
import { useMemo, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

import logo from "../assets/masthead.png";
import FleetSearch from "../components/Search/FleetSearch";
import { SearchProvider } from "../components/Search/SearchProvider";
import ThemeDropdown from "../components/Themes/ThemeDropdown";
import type { PluginPage } from "../contexts/AppConfigContext";
import { useAppConfig } from "../contexts/AppConfigContext";
import { useAuth } from "../contexts/AuthContext";

const AppMasthead = () => {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <Masthead>
      <MastheadMain>
        <MastheadToggle>
          <PageToggleButton aria-label="Navigation toggle">
            <BarsIcon />
          </PageToggleButton>
        </MastheadToggle>
        <MastheadBrand>
          <MastheadLogo component="a" href="/">
            <img src={logo} alt="FleetShift" className="ome-masthead-logo" />
          </MastheadLogo>
        </MastheadBrand>
      </MastheadMain>
      <MastheadContent>
        <Toolbar isFullHeight>
          <ToolbarContent>
            <ToolbarGroup
              className="pf-v6-u-flex-grow-1"
              variant="filter-group"
            >
              <FleetSearch />
            </ToolbarGroup>
            <ToolbarGroup align={{ default: "alignEnd" }}>
              <ToolbarItem>
                <ThemeDropdown />
              </ToolbarItem>
              <ToolbarItem>
                <Dropdown
                  isOpen={isMenuOpen}
                  onSelect={() => setIsMenuOpen(false)}
                  onOpenChange={setIsMenuOpen}
                  toggle={(toggleRef) => (
                    <MenuToggle
                      ref={toggleRef}
                      onClick={() => setIsMenuOpen((prev) => !prev)}
                      isExpanded={isMenuOpen}
                      isFullHeight
                    >
                      {user?.display_name ?? user?.username}
                    </MenuToggle>
                  )}
                >
                  <DropdownList>
                    <DropdownItem
                      icon={<BugIcon />}
                      component={(
                        props: React.HTMLAttributes<HTMLAnchorElement>,
                      ) => <Link to="/debug" {...props} />}
                    >
                      Debug
                    </DropdownItem>
                    <Divider />
                    <DropdownItem onClick={logout}>Log out</DropdownItem>
                  </DropdownList>
                </Dropdown>
              </ToolbarItem>
            </ToolbarGroup>
          </ToolbarContent>
        </Toolbar>
      </MastheadContent>
    </Masthead>
  );
};

const AppNav = () => {
  const location = useLocation();
  const { pluginPages, navLayout } = useAppConfig();
  const { order: savedOrder } = useNavOrder();

  const pageMap = useMemo(() => {
    const map = new Map<string, PluginPage>();
    for (const page of pluginPages) {
      map.set(page.id, page);
    }
    return map;
  }, [pluginPages]);

  const { mainItems, bottomItems } = useMemo(() => {
    const all: PluginPage[] = [];
    for (const entry of navLayout) {
      if (entry.type === "page") {
        const page = pageMap.get(entry.pageId);
        if (page) all.push(page);
      }
    }
    const main: PluginPage[] = [];
    const bottom: PluginPage[] = [];
    for (const page of all) {
      const meta = CORE_EXTENSION_META[page.scope];
      if (meta?.navSection === "bottom") {
        bottom.push(page);
      } else {
        main.push(page);
      }
    }
    return {
      mainItems: orderByIds(main, savedOrder, "title"),
      bottomItems: orderByIds(bottom, savedOrder, "title"),
    };
  }, [navLayout, pageMap, savedOrder]);

  const renderNavItem = (page: PluginPage) => {
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
  };

  return (
    <Nav>
      <NavList>{mainItems.map(renderNavItem)}</NavList>
      {bottomItems.length > 0 && (
        <>
          <Divider />
          <NavList>{bottomItems.map(renderNavItem)}</NavList>
        </>
      )}
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
  <SearchProvider>
    <Page
      masthead={<AppMasthead />}
      sidebar={<Sidebar />}
      isManagedSidebar
      className="ome-app"
    >
      <PageSection isFilled hasOverflowScroll>
        <Outlet />
      </PageSection>
    </Page>
  </SearchProvider>
);
