import "./setup-checklist.scss";

import { PluginLink } from "@fleetshift/common";
import type { Extension } from "@openshift/dynamic-plugin-sdk";
import { useResolvedExtensions } from "@openshift/dynamic-plugin-sdk";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Icon,
  Split,
  SplitItem,
} from "@patternfly/react-core";
import {
  CheckCircleIcon,
  CircleIcon,
  TimesIcon,
} from "@patternfly/react-icons";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getSetupProgressStore } from "../setup-plugin/setupProgress";

const DISMISS_KEY = "fleetshift:setup-checklist-dismissed";

const SETUP_STEPS = [
  {
    id: "initial-setup",
    label: "Authentication",
    ctaText: "Configure authentication",
    scope: "settings-plugin",
    module: "AuthSettingsPage",
  },
  {
    id: "signing-key-enrollment",
    label: "Signing key",
    ctaText: "Enroll signing key",
    scope: "signing-plugin",
    module: "SigningKeyEnrollment",
  },
];

type OnboardingActionExtension = Extension<
  "fleetshift.onboarding-action",
  {
    id: string;
    label: string;
    overviewCta?: string;
  }
>;

function isOnboardingAction(e: Extension): e is OnboardingActionExtension {
  return e.type === "fleetshift.onboarding-action";
}

function useSetupProgressReadonly() {
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const store = getSetupProgressStore();

    store
      .getProgress()
      .then((state) => {
        if (!cancelled) {
          setProgress(state);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });

    const unsub = store.subscribe((state) => {
      if (!cancelled) setProgress(state);
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  return { progress, loaded };
}

interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  scope: string;
  module: string;
  search?: string;
  ctaText: string;
}

export default function SetupChecklist() {
  const { progress, loaded: progressLoaded } = useSetupProgressReadonly();
  const [extensions, extensionsLoaded] =
    useResolvedExtensions(isOnboardingAction);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === "true",
  );

  const items = useMemo<ChecklistItem[]>(() => {
    const setupItems = SETUP_STEPS.map((step) => ({
      ...step,
      completed: !!progress[step.id],
    }));

    const actionItems = extensions.map((ext) => ({
      id: ext.properties.id,
      label: ext.properties.label,
      completed: !!progress[ext.properties.id],
      scope: "settings-plugin",
      module: "ExtensionsPage",
      search: `?action=${ext.properties.id}`,
      ctaText:
        ext.properties.overviewCta ?? `Configure ${ext.properties.label}`,
    }));

    return [...setupItems, ...actionItems];
  }, [progress, extensions]);

  const completedCount = items.filter((i) => i.completed).length;
  const allComplete = items.length > 0 && completedCount === items.length;

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, "true");
    setDismissed(true);
  }, []);

  if (!progressLoaded || !extensionsLoaded || dismissed || allComplete) {
    return null;
  }

  return (
    <Card className="ome-overview-checklist">
      <CardHeader
        actions={{
          actions: (
            <Button
              variant="plain"
              aria-label="Dismiss setup checklist"
              icon={<TimesIcon />}
              onClick={dismiss}
            />
          ),
        }}
      >
        <CardTitle>
          <Split hasGutter>
            <SplitItem isFilled>Getting started</SplitItem>
            <SplitItem className="pf-v6-u-font-size-sm pf-v6-u-text-color-subtle">
              {completedCount} of {items.length} complete
            </SplitItem>
          </Split>
        </CardTitle>
      </CardHeader>
      <CardBody>
        <ul className="ome-overview-checklist__list">
          {items.map((item) => (
            <li key={item.id} className="ome-overview-checklist__item">
              <Icon size="md" status={item.completed ? "success" : undefined}>
                {item.completed ? <CheckCircleIcon /> : <CircleIcon />}
              </Icon>
              <span
                className={
                  item.completed ? "pf-v6-u-text-color-subtle" : undefined
                }
              >
                {item.label}
              </span>
              {!item.completed && (
                <PluginLink
                  scope={item.scope}
                  module={item.module}
                  to={item.search ? { search: item.search } : undefined}
                  className="pf-v6-u-ml-auto"
                >
                  {item.ctaText}
                </PluginLink>
              )}
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
