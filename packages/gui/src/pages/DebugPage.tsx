import {
  Card,
  CardBody,
  CardTitle,
  CodeBlock,
  CodeBlockCode,
  Grid,
  GridItem,
  Label,
  LabelGroup,
  Stack,
  StackItem,
  Title,
} from "@patternfly/react-core";
import { useScalprum } from "@scalprum/react-core";
import { useClusters } from "../contexts/ClusterContext";
import { useAppConfig } from "../contexts/AppConfigContext";

export const DebugPage = () => {
  const { installed } = useClusters();
  const { scalprumConfig, pluginPages, navLayout, pluginEntries, assetsHost } =
    useAppConfig();
  const { config: runtimeConfig, pluginStore } = useScalprum();

  const loadedPlugins = Object.keys(runtimeConfig);

  return (
    <Stack hasGutter>
      <StackItem>
        <Title headingLevel="h1">Debug — Plugin Discovery</Title>
      </StackItem>

      {/* Connected clusters + their plugins */}
      <StackItem>
        <Card>
          <CardTitle>
            Connected Clusters ({installed.length})
          </CardTitle>
          <CardBody>
            {installed.length === 0 ? (
              <p>No clusters connected.</p>
            ) : (
              <Stack hasGutter>
                {installed.map((c) => (
                  <StackItem key={c.id}>
                    <strong>{c.name}</strong>{" "}
                    <Label
                      color={c.platform === "openshift" ? "red" : "blue"}
                      isCompact
                    >
                      {c.platform}
                    </Label>{" "}
                    <Label color="grey" isCompact>
                      v{c.version}
                    </Label>{" "}
                    <Label color="grey" isCompact>
                      {c.nodeCount} nodes
                    </Label>
                    <div style={{ marginTop: 4 }}>
                      <strong>Discovered plugins:</strong>{" "}
                      <LabelGroup>
                        {c.plugins.map((p) => (
                          <Label key={p} color="blue" isCompact>
                            {p}
                          </Label>
                        ))}
                      </LabelGroup>
                    </div>
                  </StackItem>
                ))}
              </Stack>
            )}
          </CardBody>
        </Card>
      </StackItem>

      <StackItem>
        <Grid hasGutter>
          {/* Plugin registry entries */}
          <GridItem md={6}>
            <Card isFullHeight>
              <CardTitle>
                Plugin Registry ({pluginEntries.length} entries)
              </CardTitle>
              <CardBody>
                <CodeBlock>
                  <CodeBlockCode>
                    {JSON.stringify(
                      pluginEntries.map((e) => ({
                        name: e.name,
                        key: e.key,
                        label: e.label,
                        persona: e.persona,
                        hasManifest: !!e.pluginManifest,
                      })),
                      null,
                      2,
                    )}
                  </CodeBlockCode>
                </CodeBlock>
              </CardBody>
            </Card>
          </GridItem>

          {/* Scalprum config (what the shell loads) */}
          <GridItem md={6}>
            <Card isFullHeight>
              <CardTitle>
                Scalprum Config ({loadedPlugins.length} modules)
              </CardTitle>
              <CardBody>
                <p style={{ marginBottom: 8 }}>
                  <strong>Assets host:</strong>{" "}
                  <code>{assetsHost}</code>
                </p>
                <CodeBlock>
                  <CodeBlockCode>
                    {JSON.stringify(
                      Object.fromEntries(
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
                      ),
                      null,
                      2,
                    )}
                  </CodeBlockCode>
                </CodeBlock>
              </CardBody>
            </Card>
          </GridItem>

          {/* Plugin pages (routes) */}
          <GridItem md={6}>
            <Card isFullHeight>
              <CardTitle>
                Plugin Pages / Routes ({pluginPages.length})
              </CardTitle>
              <CardBody>
                <CodeBlock>
                  <CodeBlockCode>
                    {JSON.stringify(pluginPages, null, 2)}
                  </CodeBlockCode>
                </CodeBlock>
              </CardBody>
            </Card>
          </GridItem>

          {/* Nav layout */}
          <GridItem md={6}>
            <Card isFullHeight>
              <CardTitle>
                Nav Layout ({navLayout.length} entries)
              </CardTitle>
              <CardBody>
                <CodeBlock>
                  <CodeBlockCode>
                    {JSON.stringify(navLayout, null, 2)}
                  </CodeBlockCode>
                </CodeBlock>
              </CardBody>
            </Card>
          </GridItem>
        </Grid>
      </StackItem>
    </Stack>
  );
};
