import {
  SettingsTree,
  SettingsTreeAction,
  SettingsTreeChildren,
  SettingsTreeNode,
  Topic,
} from "@foxglove/extension";

import { PanelState } from "./types";

function setNestedValue(
  obj: Record<string, unknown>,
  path: readonly string[],
  value: unknown,
): PanelState {
  if (path.length === 0) {
    return obj as PanelState;
  }
  const [head, ...rest] = path;
  const key = head!;
  return {
    ...obj,
    [key]:
      rest.length === 0
        ? value
        : setNestedValue((obj[key] ?? {}) as Record<string, unknown>, rest, value),
  } as PanelState;
}

export const DEFAULT_PANEL_STATE: PanelState = {
  subscriptions: {},
};

export const DEFAULT_VISIBLE = false;

const DEFAULT_CHILD_NODE: SettingsTreeNode = {
  visible: DEFAULT_VISIBLE,
  defaultExpansionState: "collapsed",
  fields: {
    preload: {
      input: "boolean",
      label: "Preload",
      value: false,
    },
  },
};

export function buildSettingsTree(
  panelState: PanelState,
  availableTopics: ReadonlyArray<Topic> | undefined,
  actionHandler: (action: SettingsTreeAction) => void,
): SettingsTree {
  const preloadAll = panelState.preloadAll === true;
  const children: SettingsTreeChildren = {};
  for (const { name } of availableTopics ?? []) {
    const topic = panelState.subscriptions[name];
    children[name] = {
      ...DEFAULT_CHILD_NODE,
      visible: topic?.visible ?? DEFAULT_VISIBLE,
      label: name,
      fields: {
        preload: {
          input: "boolean",
          label: "Preload",
          value: preloadAll || (topic?.preload ?? false),
          disabled: preloadAll,
          help: preloadAll ? "Controlled by the global 'Preload all topics' setting" : undefined,
        },
      },
    };
  }

  return {
    nodes: {
      general: {
        label: "General",
        defaultExpansionState: "expanded",
        fields: {
          preloadAll: {
            input: "boolean",
            label: "Preload all topics",
            value: panelState.preloadAll ?? false,
          },
        },
      },
      subscriptions: {
        label: "Subscriptions",
        enableVisibilityFilter: true,
        defaultExpansionState: "expanded",
        actions: [
          { id: "subscribe-all", type: "action", label: "Subscribe all" },
          { id: "unsubscribe-all", type: "action", label: "Unsubscribe all" },
        ],
        children,
      },
    },
    actionHandler,
    enableFilter: true,
  };
}

export type SettingsActionResult = {
  panelState: PanelState;
  resetStats: boolean;
};

export function handleSettingsAction(
  action: SettingsTreeAction,
  currentState: PanelState,
  availableTopics: ReadonlyArray<Topic> | undefined,
): SettingsActionResult {
  if (action.action === "update") {
    const { path, value } = action.payload;
    const statePath = path[0] === "general" ? path.slice(1) : path;
    return { panelState: setNestedValue(currentState, statePath, value), resetStats: false };
  }

  const { id } = action.payload;
  if (id === "subscribe-all") {
    const subscriptions: PanelState["subscriptions"] = {};
    for (const { name } of availableTopics ?? []) {
      subscriptions[name] = { visible: true };
    }
    return { panelState: { subscriptions }, resetStats: false };
  }

  if (id === "unsubscribe-all") {
    return { panelState: { subscriptions: {} }, resetStats: true };
  }

  return { panelState: currentState, resetStats: false };
}
