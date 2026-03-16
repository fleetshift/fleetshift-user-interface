import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionToggle,
  Card,
  CardBody,
  CardTitle,
  CodeBlock,
  CodeBlockCode,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Label,
  LabelGroup,
  Spinner,
  Stack,
  StackItem,
  Title,
} from "@patternfly/react-core";
import { useScalprum } from "@scalprum/react-core";
import { useClusters } from "../contexts/ClusterContext";
import { useAppConfig } from "../contexts/AppConfigContext";

const API_BASE = "http://localhost:4000/api/v1";

interface DiscoveryDetails {
  alwaysPlugins: string[];
  crdPluginMap: Record<string, string>;
  crdGroups: string[];
  apiGroups: string[];
  matchedCrdGroups: Record<string, string>;
  hasMetricsApi: boolean;
  resultPlugins: string[];
}

const JsonBlock = ({ data }: { data: unknown }) => (
  <CodeBlock>
    <CodeBlockCode>{JSON.stringify(data, null, 2)}</CodeBlockCode>
  </CodeBlock>
);

interface ConsolePluginInfo {
  name: string;
  backend: {
    type: string;
    service?: {
      name: string;
      namespace: string;
      port: number;
      basePath?: string;
    };
  };
  proxy?: Array<{
    alias: string;
    endpoint: {
      type: string;
      service?: { name: string; namespace: string; port: number };
    };
  }>;
  raw: Record<string, unknown>;
}

const ClusterDiscovery = ({
  clusterId,
  platform,
}: {
  clusterId: string;
  platform: string;
}) => {
  const [details, setDetails] = useState<DiscoveryDetails | null>(null);
  const [consolePlugins, setConsolePlugins] = useState<
    ConsolePluginInfo[] | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cpExpanded, setCpExpanded] = useState<Set<string>>(new Set());

  const toggleCp = (id: string) => {
    setCpExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    const fetches: Promise<void>[] = [
      fetch(`${API_BASE}/clusters/${clusterId}/discovery`)
        .then((res) => {
          if (!res.ok) throw new Error(`${res.status}`);
          return res.json();
        })
        .then(setDetails),
    ];

    if (platform === "openshift") {
      fetches.push(
        fetch(`${API_BASE}/clusters/${clusterId}/console-plugins`)
          .then((res) => {
            if (!res.ok) throw new Error(`${res.status}`);
            return res.json();
          })
          .then(setConsolePlugins),
      );
    }

    Promise.all(fetches)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [clusterId, platform]);

  if (loading) return <Spinner size="md" />;
  if (error) return <p>Failed to load: {error}</p>;
  if (!details) return null;

  const unmatchedCrdGroups = details.crdGroups.filter(
    (g) => !details.matchedCrdGroups[g],
  );

  return (
    <Stack hasGutter>
      <StackItem>
        <DescriptionList isHorizontal isCompact>
          <DescriptionListGroup>
            <DescriptionListTerm>Always-on plugins</DescriptionListTerm>
            <DescriptionListDescription>
              <LabelGroup>
                {details.alwaysPlugins.map((p) => (
                  <Label key={p} color="blue" isCompact>
                    {p}
                  </Label>
                ))}
              </LabelGroup>
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Metrics API detected</DescriptionListTerm>
            <DescriptionListDescription>
              <Label color={details.hasMetricsApi ? "green" : "grey"} isCompact>
                {details.hasMetricsApi ? "Yes → observability" : "No"}
              </Label>
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>CRD groups matched</DescriptionListTerm>
            <DescriptionListDescription>
              {Object.keys(details.matchedCrdGroups).length === 0 ? (
                <Label color="grey" isCompact>
                  None
                </Label>
              ) : (
                <LabelGroup>
                  {Object.entries(details.matchedCrdGroups).map(
                    ([group, plugin]) => (
                      <Label key={group} color="green" isCompact>
                        {group} → {plugin}
                      </Label>
                    ),
                  )}
                </LabelGroup>
              )}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Result plugins</DescriptionListTerm>
            <DescriptionListDescription>
              <LabelGroup>
                {details.resultPlugins.map((p) => (
                  <Label key={p} color="blue" isCompact>
                    {p}
                  </Label>
                ))}
              </LabelGroup>
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      </StackItem>
      <StackItem>
        <Title headingLevel="h4" size="md">
          CRD Plugin Mapping (config)
        </Title>
        <JsonBlock data={details.crdPluginMap} />
      </StackItem>
      <StackItem>
        <Title headingLevel="h4" size="md">
          All CRD Groups ({details.crdGroups.length})
        </Title>
        <JsonBlock data={details.crdGroups} />
      </StackItem>
      {unmatchedCrdGroups.length > 0 && (
        <StackItem>
          <Title headingLevel="h4" size="md">
            Unmatched CRD Groups ({unmatchedCrdGroups.length})
          </Title>
          <JsonBlock data={unmatchedCrdGroups} />
        </StackItem>
      )}
      <StackItem>
        <Title headingLevel="h4" size="md">
          All API Groups ({details.apiGroups.length})
        </Title>
        <JsonBlock data={details.apiGroups} />
      </StackItem>
      {consolePlugins && consolePlugins.length > 0 && (
        <StackItem>
          <Title headingLevel="h4" size="md">
            OpenShift ConsolePlugins ({consolePlugins.length})
          </Title>
          <Accordion
            isBordered
            asDefinitionList={false}
            aria-label="Console plugins"
          >
            {consolePlugins.map((cp) => {
              const cpId = `cp-${cp.name}`;
              return (
                <AccordionItem key={cp.name} isExpanded={cpExpanded.has(cpId)}>
                  <AccordionToggle id={cpId} onClick={() => toggleCp(cpId)}>
                    <strong>{cp.name}</strong>{" "}
                    <Label color="grey" isCompact>
                      {cp.backend.type}
                    </Label>
                    {cp.backend.service && (
                      <>
                        {" "}
                        <Label color="blue" isCompact>
                          {cp.backend.service.namespace}/
                          {cp.backend.service.name}:{cp.backend.service.port}
                        </Label>
                      </>
                    )}
                  </AccordionToggle>
                  <AccordionContent>
                    <Stack hasGutter>
                      <StackItem>
                        <DescriptionList isHorizontal isCompact>
                          <DescriptionListGroup>
                            <DescriptionListTerm>
                              Backend Type
                            </DescriptionListTerm>
                            <DescriptionListDescription>
                              {cp.backend.type}
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                          {cp.backend.service && (
                            <>
                              <DescriptionListGroup>
                                <DescriptionListTerm>
                                  Service
                                </DescriptionListTerm>
                                <DescriptionListDescription>
                                  {cp.backend.service.namespace}/
                                  {cp.backend.service.name}
                                </DescriptionListDescription>
                              </DescriptionListGroup>
                              <DescriptionListGroup>
                                <DescriptionListTerm>Port</DescriptionListTerm>
                                <DescriptionListDescription>
                                  {cp.backend.service.port}
                                </DescriptionListDescription>
                              </DescriptionListGroup>
                              {cp.backend.service.basePath && (
                                <DescriptionListGroup>
                                  <DescriptionListTerm>
                                    Base Path
                                  </DescriptionListTerm>
                                  <DescriptionListDescription>
                                    {cp.backend.service.basePath}
                                  </DescriptionListDescription>
                                </DescriptionListGroup>
                              )}
                            </>
                          )}
                        </DescriptionList>
                      </StackItem>
                      {cp.proxy && cp.proxy.length > 0 && (
                        <StackItem>
                          <Title headingLevel="h5" size="md">
                            Proxy Endpoints
                          </Title>
                          <JsonBlock data={cp.proxy} />
                        </StackItem>
                      )}
                      <StackItem>
                        <Title headingLevel="h5" size="md">
                          Raw CRD
                        </Title>
                        <JsonBlock data={cp.raw} />
                      </StackItem>
                    </Stack>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </StackItem>
      )}
    </Stack>
  );
};

export const DebugPage = () => {
  const { installed } = useClusters();
  const { scalprumConfig, pluginPages, navLayout, pluginEntries, assetsHost } =
    useAppConfig();
  const { config: runtimeConfig } = useScalprum();

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const loadedPlugins = Object.keys(runtimeConfig);

  return (
    <Stack hasGutter>
      <StackItem>
        <Title headingLevel="h1">Debug — Plugin Discovery</Title>
      </StackItem>

      {/* Connected clusters + discovery */}
      <StackItem>
        <Card>
          <CardTitle>Connected Clusters ({installed.length})</CardTitle>
          <CardBody>
            {installed.length === 0 ? (
              <p>No clusters connected.</p>
            ) : (
              <Accordion
                isBordered
                asDefinitionList={false}
                aria-label="Connected clusters"
              >
                {installed.map((c) => {
                  const id = `cluster-${c.id}`;
                  return (
                    <AccordionItem key={c.id} isExpanded={expanded.has(id)}>
                      <AccordionToggle id={id} onClick={() => toggle(id)}>
                        <strong>{c.name}</strong>{" "}
                        <Label
                          color={c.platform === "openshift" ? "red" : "blue"}
                          isCompact
                          style={{ marginLeft: 8 }}
                        >
                          {c.platform}
                        </Label>{" "}
                        <Label color="grey" isCompact>
                          v{c.version}
                        </Label>{" "}
                        <Label color="grey" isCompact>
                          {c.nodeCount} nodes
                        </Label>{" "}
                        <Label color="blue" isCompact>
                          {c.plugins.length} plugins
                        </Label>
                      </AccordionToggle>
                      <AccordionContent>
                        <Stack hasGutter>
                          <StackItem>
                            <strong>Discovered plugins:</strong>{" "}
                            <LabelGroup>
                              {c.plugins.map((p) => (
                                <Label key={p} color="blue" isCompact>
                                  {p}
                                </Label>
                              ))}
                            </LabelGroup>
                          </StackItem>
                          <StackItem>
                            <Title headingLevel="h3" size="lg">
                              Discovery Source Data
                            </Title>
                            {expanded.has(id) && (
                              <ClusterDiscovery
                                clusterId={c.id}
                                platform={c.platform ?? "kubernetes"}
                              />
                            )}
                          </StackItem>
                        </Stack>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </CardBody>
        </Card>
      </StackItem>

      {/* Collapsible panels for registry, scalprum config, routes, nav */}
      <StackItem>
        <Card>
          <CardBody style={{ padding: 0 }}>
            <Accordion
              isBordered
              asDefinitionList={false}
              aria-label="Debug panels"
            >
              <AccordionItem isExpanded={expanded.has("plugin-registry")}>
                <AccordionToggle
                  id="plugin-registry"
                  onClick={() => toggle("plugin-registry")}
                >
                  Plugin Registry ({pluginEntries.length} entries)
                </AccordionToggle>
                <AccordionContent>
                  <JsonBlock
                    data={pluginEntries.map((e) => ({
                      name: e.name,
                      key: e.key,
                      label: e.label,
                      persona: e.persona,
                      hasManifest: !!e.pluginManifest,
                    }))}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem isExpanded={expanded.has("scalprum-config")}>
                <AccordionToggle
                  id="scalprum-config"
                  onClick={() => toggle("scalprum-config")}
                >
                  Scalprum Config ({loadedPlugins.length} modules) — Assets:{" "}
                  <code>{assetsHost}</code>
                </AccordionToggle>
                <AccordionContent>
                  <JsonBlock
                    data={Object.fromEntries(
                      Object.entries(scalprumConfig).map(([k, v]) => [
                        k,
                        {
                          name: (v as Record<string, unknown>).name,
                          manifestLocation: (v as Record<string, unknown>)
                            .manifestLocation,
                          hasPluginManifest: !!(v as Record<string, unknown>)
                            .pluginManifest,
                        },
                      ]),
                    )}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem isExpanded={expanded.has("plugin-pages")}>
                <AccordionToggle
                  id="plugin-pages"
                  onClick={() => toggle("plugin-pages")}
                >
                  Plugin Pages / Routes ({pluginPages.length})
                </AccordionToggle>
                <AccordionContent>
                  <JsonBlock data={pluginPages} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem isExpanded={expanded.has("nav-layout")}>
                <AccordionToggle
                  id="nav-layout"
                  onClick={() => toggle("nav-layout")}
                >
                  Nav Layout ({navLayout.length} entries)
                </AccordionToggle>
                <AccordionContent>
                  <JsonBlock data={navLayout} />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardBody>
        </Card>
      </StackItem>
    </Stack>
  );
};
