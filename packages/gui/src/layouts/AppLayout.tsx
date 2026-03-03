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
  ToolbarItem,
  Divider,
  ToggleGroup,
  ToggleGroupItem,
} from "@patternfly/react-core";
import { BarsIcon } from "@patternfly/react-icons";
import { useResolvedExtensions } from "@openshift/dynamic-plugin-sdk";
import { useScope } from "../contexts/ScopeContext";
import { useAuth } from "../contexts/AuthContext";
import { useUserPreferences } from "../contexts/UserPreferencesContext";
import { isNavItem, pluginKeyFromName } from "../utils/extensions";
import { ClusterSwitcher } from "./ClusterSwitcher";
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
          <img src={logo} alt="FleetShift" style={{ height: 36 }} />
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
        </ToolbarContent>
      </Toolbar>
    </MastheadContent>
  </Masthead>
);

const AppNav = () => {
  const location = useLocation();
  const { clusterIdsForPlugin } = useScope();
  const { isPathEnabled } = useUserPreferences();
  const [navExtensions, navResolved] = useResolvedExtensions(isNavItem);

  // Deduplicate, filter by scope + user prefs, sort alphabetically
  const seen = new Set<string>();
  const visibleExtensions = navResolved
    ? navExtensions
        .filter((ext) => {
          if (seen.has(ext.properties.path)) return false;
          seen.add(ext.properties.path);
          const pluginKey = pluginKeyFromName(ext.pluginName);
          return (
            clusterIdsForPlugin(pluginKey).length > 0 &&
            isPathEnabled(ext.properties.path)
          );
        })
        .sort((a, b) => a.properties.label.localeCompare(b.properties.label))
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
        {visibleExtensions.length > 0 && <Divider component="li" />}
        {visibleExtensions.map((ext) => {
          const path = `/${ext.properties.path}`;
          return (
            <NavItem key={ext.uid} isActive={location.pathname === path}>
              <Link to={path}>{ext.properties.label}</Link>
            </NavItem>
          );
        })}
        <Divider component="li" />
        <NavItem isActive={location.pathname === "/marketplace"}>
          <Link to="/marketplace">Marketplace</Link>
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
    <PageSection isFilled>
      <Outlet />
    </PageSection>
  </Page>
);
