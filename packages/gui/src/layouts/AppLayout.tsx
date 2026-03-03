import { Outlet, Link, useLocation } from "react-router-dom";
import {
  Masthead,
  MastheadBrand,
  MastheadContent,
  MastheadLogo,
  MastheadMain,
  Nav,
  NavItem,
  NavList,
  Page,
  PageSection,
  PageSidebar,
  PageSidebarBody,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from "@patternfly/react-core";
import { useResolvedExtensions } from "@openshift/dynamic-plugin-sdk";
import { useScope } from "../contexts/ScopeContext";
import { isNavItem, pluginKeyFromName } from "../utils/extensions";
import { ClusterSwitcher } from "./ClusterSwitcher";

const AppMasthead = () => (
  <Masthead>
    <MastheadMain>
      <MastheadBrand>
        <MastheadLogo component="a" href="/">
          FleetShift
        </MastheadLogo>
      </MastheadBrand>
    </MastheadMain>
    <MastheadContent>
      <Toolbar>
        <ToolbarContent>
          <ToolbarItem>
            <ClusterSwitcher />
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>
    </MastheadContent>
  </Masthead>
);

const AppNav = () => {
  const location = useLocation();
  const { clusterIdsForPlugin } = useScope();
  const [navExtensions, navResolved] = useResolvedExtensions(isNavItem);

  // Deduplicate by path and filter by scope
  const seen = new Set<string>();
  const visibleExtensions = navResolved
    ? navExtensions.filter((ext) => {
        if (seen.has(ext.properties.path)) return false;
        seen.add(ext.properties.path);
        const pluginKey = pluginKeyFromName(ext.pluginName);
        return clusterIdsForPlugin(pluginKey).length > 0;
      })
    : [];

  return (
    <Nav>
      <NavList>
        <NavItem isActive={location.pathname === "/"}>
          <Link to="/">Dashboard</Link>
        </NavItem>
        <NavItem isActive={location.pathname === "/clusters"}>
          <Link to="/clusters">Clusters</Link>
        </NavItem>
        {visibleExtensions.map((ext) => {
          const path = `/${ext.properties.path}`;
          return (
            <NavItem key={ext.uid} isActive={location.pathname === path}>
              <Link to={path}>{ext.properties.label}</Link>
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
  <Page masthead={<AppMasthead />} sidebar={<Sidebar />}>
    <PageSection isFilled>
      <Outlet />
    </PageSection>
  </Page>
);
