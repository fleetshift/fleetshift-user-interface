import chalk from "chalk";

import {
  type BaseExtensionProperties,
  type ClusterProviderProperties,
  type EncodedCodeRef,
  type FleetshiftExtension,
  type ModuleProperties,
  type SetupProperties,
} from "./types";

const TAG = chalk.red("[FleetshiftPlugin]");

function isCodeRef(value: unknown): value is EncodedCodeRef {
  return (
    typeof value === "object" &&
    value !== null &&
    "$codeRef" in value &&
    typeof (value as EncodedCodeRef).$codeRef === "string"
  );
}

const CODEREF_PATTERN = /^[A-Za-z_]\w*\.[A-Za-z_]\w*$/;

export function validateCodeRef(
  ref: unknown,
  field: string,
  extensionId: string,
): string[] {
  if (!isCodeRef(ref)) {
    return [
      `${extensionId}: "${field}" must be a CodeRef ({ $codeRef: "ModuleName.exportName" })`,
    ];
  }
  if (!CODEREF_PATTERN.test(ref.$codeRef)) {
    return [
      `${extensionId}: "${field}" has invalid $codeRef "${ref.$codeRef}" — expected "ModuleName.exportName"`,
    ];
  }
  return [];
}

function validateId(id: unknown, context: string): string[] {
  if (typeof id !== "string" || id.length === 0) {
    return [`${context}: "id" is required and must be a non-empty string`];
  }
  if (!/^[a-z][a-z0-9-]*$/.test(id)) {
    return [
      `${context}: "id" must start with a lowercase letter and contain only a-z, 0-9, hyphens (got "${id}")`,
    ];
  }
  return [];
}

function validateLabel(label: unknown, context: string): string[] {
  if (typeof label !== "string" || label.length === 0) {
    return [`${context}: "label" is required and must be a non-empty string`];
  }
  return [];
}

function validateBaseProperties(
  props: BaseExtensionProperties,
  ctx: string,
): string[] {
  return [
    ...validateId(props.id, ctx),
    ...validateLabel(props.label, ctx),
    ...(props.searchResult
      ? validateCodeRef(props.searchResult, "searchResult", ctx)
      : []),
    ...(props.searchIcon
      ? validateCodeRef(props.searchIcon, "searchIcon", ctx)
      : []),
  ];
}

export function validateModuleProperties(props: ModuleProperties): string[] {
  const ctx = `fleetshift.module "${props.id || "(no id)"}"`;
  return [
    ...validateBaseProperties(props, ctx),
    ...validateCodeRef(props.component, "component", ctx),
  ];
}

export function validateSetupProperties(props: SetupProperties): string[] {
  const ctx = `fleetshift.setup "${props.id || "(no id)"}"`;
  const errors = [
    ...validateBaseProperties(props, ctx),
    ...validateCodeRef(props.component, "component", ctx),
  ];

  if (typeof props.path !== "string" || props.path.length === 0) {
    errors.push(`${ctx}: "path" is required and must be a non-empty string`);
  }
  if (!Array.isArray(props.requires)) {
    errors.push(`${ctx}: "requires" must be an array of dependency IDs`);
  } else if (
    props.requires.some(
      (dep) =>
        typeof dep !== "string" ||
        dep.length === 0 ||
        !/^[a-z][a-z0-9-]*$/.test(dep),
    )
  ) {
    errors.push(
      `${ctx}: "requires" entries must be non-empty dependency IDs matching /^[a-z][a-z0-9-]*$/`,
    );
  }
  if (typeof props.requiresAuth !== "boolean") {
    errors.push(`${ctx}: "requiresAuth" must be a boolean`);
  }

  return errors;
}

export function validateClusterProviderProperties(
  props: ClusterProviderProperties,
): string[] {
  const ctx = `fleetshift.cluster-provider "${props.id || "(no id)"}"`;
  const errors = [
    ...validateBaseProperties(props, ctx),
    ...validateCodeRef(props.icon, "icon", ctx),
    ...validateCodeRef(props.card, "card", ctx),
    ...validateCodeRef(props.wizard, "wizard", ctx),
  ];

  if (typeof props.description !== "string" || props.description.length === 0) {
    errors.push(
      `${ctx}: "description" is required and must be a non-empty string`,
    );
  }

  return errors;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function validateSingleExtension(ext: FleetshiftExtension): string[] {
  const props = asRecord(ext.properties);
  if (!props) {
    return [`${ext.type}: "properties" must be an object`];
  }
  switch (ext.type) {
    case "fleetshift.module":
      return validateModuleProperties(props as unknown as ModuleProperties);
    case "fleetshift.setup":
      return validateSetupProperties(props as unknown as SetupProperties);
    case "fleetshift.cluster-provider":
      return validateClusterProviderProperties(
        props as unknown as ClusterProviderProperties,
      );
    default: {
      const id = typeof props.id === "string" ? props.id : "(no id)";
      return validateBaseProperties(
        props as BaseExtensionProperties,
        `${ext.type} "${id}"`,
      );
    }
  }
}

function extractCodeRefs(
  properties: Record<string, unknown>,
): EncodedCodeRef[] {
  const refs: EncodedCodeRef[] = [];
  for (const value of Object.values(properties)) {
    if (isCodeRef(value)) {
      refs.push(value);
    }
  }
  return refs;
}

export function validateExtensionSet(
  extensions: FleetshiftExtension[],
  exposedModules: Record<string, string>,
): void {
  const errors: string[] = [];
  const seenIds = new Map<string, string>();
  const exposedKeys = new Set(Object.keys(exposedModules));

  for (const ext of extensions) {
    errors.push(...validateSingleExtension(ext));

    const props = asRecord(ext.properties);
    if (!props) {
      continue;
    }

    if (typeof props.id === "string" && props.id.length > 0) {
      const existing = seenIds.get(props.id);
      if (existing) {
        errors.push(
          `Duplicate extension ID "${props.id}" — first declared as ${existing}, also declared as ${ext.type}`,
        );
      } else {
        seenIds.set(props.id, ext.type);
      }
    }

    for (const ref of extractCodeRefs(props)) {
      const moduleName = ref.$codeRef.split(".")[0];
      if (!exposedKeys.has(moduleName)) {
        errors.push(
          `CodeRef "${ref.$codeRef}" references module "${moduleName}" which is not in exposedModules. Available: ${[...exposedKeys].join(", ")}`,
        );
      }
    }
  }

  if (errors.length > 0) {
    const message = [
      `${TAG} Extension validation failed with ${errors.length} error(s):`,
      ...errors.map((e) => `  - ${e}`),
    ].join("\n");
    throw new Error(message);
  }
}
