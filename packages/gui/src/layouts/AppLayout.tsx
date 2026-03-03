import { Outlet, Link, useLocation } from "react-router-dom";
import {
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
  const { navLayout } = useUserPreferences();
  const [navExtensions, navResolved] = useResolvedExtensions(isNavItem);

  // Build a lookup: path → extension (deduplicated)
  const extByPath = new Map<string, (typeof navExtensions)[number]>();
  if (navResolved) {
    for (const ext of navExtensions) {
      if (extByPath.has(ext.properties.path)) continue;
      const pluginKey = pluginKeyFromName(ext.pluginName);
      if (clusterIdsForPlugin(pluginKey).length > 0) {
        extByPath.set(ext.properties.path, ext);
      }
    }
  }

  const renderNavItem = (path: string) => {
    const ext = extByPath.get(path);
    if (!ext) return null;
    const fullPath = `/${path}`;
    return (
      <NavItem key={path} isActive={location.pathname === fullPath}>
        <Link to={fullPath}>{ext.properties.label}</Link>
      </NavItem>
    );
  };

  // Collect rendered layout entries, filtering out items whose plugin isn't available
  const layoutEntries: React.ReactNode[] = [];
  for (const entry of navLayout) {
    if (entry.type === "item") {
      const node = renderNavItem(entry.path);
      if (node) layoutEntries.push(node);
    } else {
      const children = entry.children
        .map((child) => renderNavItem(child.path))
        .filter(Boolean);
      if (children.length > 0) {
        const isActive = entry.children.some(
          (child) => location.pathname === `/${child.path}`,
        );
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
