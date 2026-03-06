/* eslint-disable @typescript-eslint/no-extra-non-null-assertion */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { ComponentType, memo, Suspense, useMemo } from "react";
import * as _ from "lodash";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
  ExtensionK8sGroupModel,
  ExtensionK8sKindVersionModel,
  K8sResourceCommon,
  K8sResourceKind,
  Page,
  PageComponentProps,
  referenceForExtensionModel,
} from "../utils";
import { PageBody, Spinner } from "@patternfly/react-core";
import StatusBox from "../StatusBox";
import {
  CodeRef,
  Extension,
  useExtensions,
} from "@openshift/dynamic-plugin-sdk";
import { AsyncComponent } from "../AsyncComponent";
import { NavBar } from "./NavBar";

export type HorizontalNavTab = Extension<
  "console.tab/horizontalNav",
  {
    /** The model for which this provider show tab. */
    model: ExtensionK8sKindVersionModel;
    /** The page to be show in horizontal tab. It takes tab name as name and href of the tab.
     * Note: any special characters in href are encoded, and href is treated as a single
     * path element. */
    page: {
      name: string;
      href: string;
    };
    /** The component to be rendered when the route matches. */
    component: CodeRef<React.ComponentType<PageComponentProps>>;
  }
>;

export type NavTab = Extension<
  "console.tab",
  {
    /** Context ID assigned to the horizontal nav in which the tab will be injected.
     * Possible values:
     * - `dev-console-observe`
     */
    contextId: string;
    /** The display label of the tab */
    name: string;
    /** The href appended to the existing URL */
    href: string;
    /** Tab content component. */
    component: CodeRef<React.ComponentType<PageComponentProps>>;
  }
>;

export const isTab = (e: Extension): e is NavTab => e.type === "console.tab";

export const isHorizontalNavTab = (e: Extension): e is HorizontalNavTab =>
  e.type === "console.tab/horizontalNav";

export type NavPage = {
  href?: string;
  path?: string;
  name: string;
  component: ComponentType;
};

export type HorizontalNavFacadeProps = {
  resource?: K8sResourceCommon;
  pages: NavPage[];
  customData?: object;
  contextId?: string;
};

export type HorizontalNavProps = Omit<
  HorizontalNavFacadeProps,
  "pages" | "resource"
> & {
  /* The facade support a limited set of properties for pages */
  className?: string;
  createRedirect?: boolean;
  contextId?: string;
  pages: Page[];
  label?: string;
  obj?: { data: K8sResourceCommon; loaded: boolean };
  pagesFor?: (obj: K8sResourceKind) => Page[];
  resourceKeys?: string[];
  hideNav?: boolean;
  EmptyMsg?: ComponentType<any>;
  customData?: any;
  noStatusBox?: boolean;
};

export const HorizontalNav = memo<HorizontalNavProps>((props) => {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const componentProps = {
    ..._.pick(props, ["filters", "selected", "loaded"]),
    obj: _.get(props.obj, "data"),
  };
  const extraResources = _.reduce(
    props.resourceKeys,
    // @ts-ignore
    (extraObjs, key) => ({ ...extraObjs, [key]: _.get(props[key], "data") }),
    {},
  );

  const objReference = props.obj?.data
    ? referenceForExtensionModel(props.obj.data as unknown as any)
    : "";
  const contextId = props.contextId;
  const horizontalTabExtensions =
    useExtensions<HorizontalNavTab>(isHorizontalNavTab);
  const navTabExtensions = useExtensions<NavTab>(isTab);

  const pluginPages = useMemo(() => {
    const resolvedResourceNavTab = horizontalTabExtensions
      .filter(
        (tab) =>
          referenceForExtensionModel(
            tab.properties.model as ExtensionK8sGroupModel,
          ) === objReference,
      )
      .map((tab) => ({
        ...tab.properties.page,
        component: (pageProps: PageComponentProps) => (
          <AsyncComponent {...pageProps} loader={tab.properties.component} />
        ),
      }));

    const resolvedNavTab = navTabExtensions
      .filter((tab) => tab.properties.contextId === contextId)
      .map((tab) => ({
        name: tab.properties.name,
        href: tab.properties.href,
        component: (pageProps: PageComponentProps) => (
          <AsyncComponent {...pageProps} loader={tab.properties.component} />
        ),
      }));

    return [...resolvedResourceNavTab, ...resolvedNavTab].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [horizontalTabExtensions, navTabExtensions, objReference, contextId]);

  const pages: Page[] = [
    ...(props.pages || props.pagesFor?.(props.obj!?.data)),
    ...pluginPages,
  ];

  const pathSegments = location.pathname.split("/").filter(Boolean);
  const lastSegment = pathSegments[pathSegments.length - 1] || "";
  const matchedTab = pages.find((p) => p.href && p.href === lastSegment);
  const activeTabKey = matchedTab?.href ?? "";

  const basePath = matchedTab
    ? "/" + pathSegments.slice(0, -1).join("/")
    : location.pathname;

  const handleTabChange = (href: string) => {
    if (!href) {
      navigate(basePath);
    } else {
      const base = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
      navigate(`${base}/${href}`);
    }
  };

  const activePage =
    pages.find((p) => (p.href ?? "") === activeTabKey) ?? pages[0];

  const activeContent = activePage?.component ? (
    <Suspense fallback={<Spinner size="xl" />}>
      {/* @ts-ignore */}
      <activePage.component
        {...params}
        {...componentProps}
        {...extraResources}
        {...activePage.pageData}
        customData={props.customData}
        params={params}
      />
    </Suspense>
  ) : null;

  const content = props.noStatusBox ? (
    activeContent
  ) : (
    <StatusBox
      {...props.obj}
      EmptyMsg={props.EmptyMsg}
      label={props.label}
    >
      {activeContent}
    </StatusBox>
  );

  return (
    <PageBody className={props.className}>
      {!props.hideNav && (
        <NavBar
          pages={pages}
          activeKey={activeTabKey}
          onTabChange={handleTabChange}
        />
      )}
      {content}
    </PageBody>
  );
}, _.isEqual);

type NavFactory = { [name: string]: (c?: ComponentType<any>) => Page };
export const navFactory: NavFactory = {
  details: (component) => ({
    href: "",
    // t('public~Details')
    nameKey: "public~Details",
    component,
  }),
  events: (component) => ({
    href: "events",
    // t('public~Events')
    nameKey: "public~Events",
    component,
  }),
  logs: (component) => ({
    href: "logs",
    // t('public~Logs')
    nameKey: "public~Logs",
    component,
  }),
  editYaml: (component) => ({
    href: "yaml",
    // t('public~YAML')
    nameKey: "public~YAML",
    component: component || (() => <>Yaml editor</>),
  }),
  pods: (component) => ({
    href: "pods",
    // t('public~Pods')
    nameKey: "public~Pods",
    component: component || (() => <>Pods</>),
  }),
  jobs: (component) => ({
    href: "jobs",
    // t('public~Jobs')
    nameKey: "public~Jobs",
    component,
  }),
  roles: (component) => ({
    href: "roles",
    // t('public~RoleBindings')
    nameKey: "public~RoleBindings",
    component,
  }),
  builds: (component) => ({
    href: "builds",
    // t('public~Builds')
    nameKey: "public~Builds",
    component,
  }),
  envEditor: (component) => ({
    href: "environment",
    // t('public~Environment')
    nameKey: "public~Environment",
    component,
  }),
  clusterOperators: (component) => ({
    href: "clusteroperators",
    // t('public~Cluster Operators')
    nameKey: "public~Cluster Operators",
    component,
  }),
  machineConfigs: (component) => ({
    href: "machineconfigs",
    // t('public~MachineConfigs')
    nameKey: "public~MachineConfigs",
    component,
  }),
  machines: (component) => ({
    href: "machines",
    // t('public~Machines')
    nameKey: "public~Machines",
    component,
  }),
  workloads: (component) => ({
    href: "workloads",
    // t('public~Workloads')
    nameKey: "public~Workloads",
    component,
  }),
  history: (component) => ({
    href: "history",
    // t('public~History')
    nameKey: "public~History",
    component,
  }),
  metrics: (component) => ({
    href: "metrics",
    // t('public~Metrics')
    nameKey: "public~Metrics",
    component: component ?? (() => <>Metrics dashboard</>),
  }),
  terminal: (component) => ({
    href: "terminal",
    // t('public~Terminal')
    nameKey: "public~Terminal",
    component,
  }),
};
