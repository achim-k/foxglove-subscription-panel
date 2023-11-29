import {
  Immutable,
  PanelExtensionContext,
  RenderState,
  SettingsTree,
  SettingsTreeAction,
  SettingsTreeChildren,
  SettingsTreeNode,
  Topic,
} from "@foxglove/studio";
import {
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ThemeProvider,
  createTheme,
} from "@mui/material";
import { produce } from "immer";
import { set } from "lodash";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";

type Stats = {
  numMsgs: number;
};

type PanelState = {
  subscriptions: Record<string, { visible?: boolean; preload?: boolean } | undefined>;
};

const DEFAULT_PANEL_STATE: PanelState = {
  subscriptions: {},
};

const DEFAULT_CHILD_NODE: SettingsTreeNode = {
  visible: false,
  defaultExpansionState: "collapsed",
  fields: {
    preload: {
      input: "boolean",
      label: "Preload",
      value: false,
    },
  },
};

function SubscriptionTestPanel({ context }: { context: PanelExtensionContext }): JSX.Element {
  const [colorScheme, setColorScheme] = useState<"dark" | "light" | undefined>();
  const [topics, setTopics] = useState<undefined | Immutable<Topic[]>>();
  const [totalStats, setTotalStats] = useState<Stats>({ numMsgs: 0 });
  const [allFrames, setAllFrames] = useState<Immutable<RenderState["allFrames"]> | undefined>();
  const rcvdMsgsByTopic = useRef<Map<string, Stats>>(new Map());
  const preloadedMsgsByTopic = useRef<Map<string, Stats>>(new Map());

  const [panelState, setPanelState] = useState<PanelState>({
    ...DEFAULT_PANEL_STATE,
    ...(context.initialState as PanelState),
  });

  const resetStats = useCallback(() => {
    rcvdMsgsByTopic.current.clear();
  }, [rcvdMsgsByTopic]);

  const actionHandler = useCallback(
    (action: SettingsTreeAction) => {
      if (action.action === "update") {
        const { path, value } = action.payload;
        setPanelState(produce((draft: PanelState) => set(draft, path, value) as PanelState));
      } else {
        const { id } = action.payload;
        if (id === "subscribe-all") {
          setPanelState({
            subscriptions: (topics ?? []).reduce(
              (acc, { name }) => ({ ...acc, [name]: { visible: true } }),
              {},
            ),
          });
        } else if (id === "unsubscribe-all") {
          setPanelState({ subscriptions: {} });
          resetStats();
        }
      }
    },
    [topics, resetStats],
  );

  useEffect(() => {
    context.saveState(panelState);

    const children: SettingsTreeChildren = (topics ?? []).reduce((acc, { name }) => {
      const topic = panelState.subscriptions[name];
      const value: SettingsTreeNode = {
        ...DEFAULT_CHILD_NODE,
        visible: topic?.visible ?? DEFAULT_CHILD_NODE.visible,
        label: name,
        fields: {
          preload: {
            input: "boolean",
            label: "Preload",
            value: topic?.preload,
          },
        },
      };

      return { ...acc, [name]: { ...value } };
    }, {});

    const panelSettings: SettingsTree = {
      nodes: {
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

    context.updatePanelSettingsEditor(panelSettings);
  }, [actionHandler, context, panelState, topics]);

  useLayoutEffect(() => {
    context.onRender = (renderState, done) => {
      setTopics(renderState.topics);
      setColorScheme(renderState.colorScheme);

      renderState.currentFrame?.forEach(({ topic }) => {
        const stats = rcvdMsgsByTopic.current.get(topic);
        if (stats) {
          stats.numMsgs++;
        } else {
          rcvdMsgsByTopic.current.set(topic, { numMsgs: 1 });
        }
      });

      setAllFrames(renderState.allFrames);
      done();
    };

    context.watch("topics");
    context.watch("currentFrame");
    context.watch("allFrames");
    context.watch("colorScheme");
  }, [context, rcvdMsgsByTopic]);

  const subscribedTopics = useMemo(() => {
    console.log(`New subscribed topics!!!!`);
    return Object.entries(panelState.subscriptions)
      .filter(([_, options]) => options?.visible ?? DEFAULT_CHILD_NODE.visible)
      .map(([topic, options]) => ({
        topic,
        preload: options?.preload,
        datatype: topics?.find((t) => t.name === topic)?.schemaName,
      }));
  }, [panelState, topics]);

  useEffect(() => {
    context.subscribe(subscribedTopics);
  }, [context, subscribedTopics]);

  useEffect(() => {
    preloadedMsgsByTopic.current.clear();
    allFrames?.forEach(({ topic }) => {
      const stats = preloadedMsgsByTopic.current.get(topic);
      if (stats) {
        stats.numMsgs++;
      } else {
        preloadedMsgsByTopic.current.set(topic, { numMsgs: 1 });
      }
    });
  }, [allFrames]);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: colorScheme ?? "light",
        },
      }),
    [colorScheme],
  );

  // This causes the actual rendering.
  useEffect(() => {
    const interval = setInterval(() => {
      const newTotalStats: Stats = { numMsgs: 0 };
      for (const stats of rcvdMsgsByTopic.current.values()) {
        newTotalStats.numMsgs += stats.numMsgs;
      }
      setTotalStats(newTotalStats);
    }, 500);
    return () => {
      clearInterval(interval);
    };
  }, [rcvdMsgsByTopic]);

  return (
    <ThemeProvider theme={theme}>
      <Stack
        spacing={1}
        sx={{ padding: "0.5em 0", position: "relative", height: "100%", width: "100%" }}
      >
        <TableContainer sx={{ overflow: "auto", height: "100%", padding: "1em" }}>
          <Table aria-labelledby="tableTitle" size={"small"}>
            <TableHead>
              <TableRow>
                <TableCell align="left">Topic</TableCell>
                <TableCell align="left">Datatype</TableCell>
                <TableCell align="right">Received msgs</TableCell>
                <TableCell align="left">Preloaded</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {subscribedTopics.map(({ topic, datatype }) => {
                return (
                  <TableRow key={topic}>
                    <TableCell align="left" component="th" scope="row" padding="none">
                      {topic}
                    </TableCell>
                    <TableCell align="left">{datatype ?? "<topic not available>"}</TableCell>
                    <TableCell align="right">
                      {rcvdMsgsByTopic.current.get(topic)?.numMsgs ?? 0}
                    </TableCell>
                    <TableCell align="left">
                      {preloadedMsgsByTopic.current.get(topic)?.numMsgs ?? 0}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <caption>
          Total msgs received: {totalStats.numMsgs}{" "}
          <Button size="small" onClick={resetStats}>
            Reset stats
          </Button>
        </caption>
      </Stack>
    </ThemeProvider>
  );
}

export function initSubscriptionTestPanel(context: PanelExtensionContext): () => void {
  ReactDOM.render(<SubscriptionTestPanel context={context} />, context.panelElement);
  return () => {
    ReactDOM.unmountComponentAtNode(context.panelElement);
  };
}
