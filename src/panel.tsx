import {
  Immutable,
  MessageEvent,
  PanelExtensionContext,
  SettingsTreeAction,
  Topic,
} from "@foxglove/extension";
import { Stack, ThemeProvider, createTheme } from "@mui/material";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import { TopicRow, TopicTable } from "./TopicTable";
import {
  DEFAULT_PANEL_STATE,
  DEFAULT_VISIBLE,
  buildSettingsTree,
  handleSettingsAction,
} from "./settings";
import { TopicStatsMap } from "./topicStats";
import { PanelState } from "./types";

function SubscriptionTestPanel({ context }: { context: PanelExtensionContext }): JSX.Element {
  const [colorScheme, setColorScheme] = useState<"dark" | "light" | undefined>();
  const [availableTopics, setAvailableTopics] = useState<ReadonlyArray<Topic>>();
  const [totalReceived, setTotalReceived] = useState(0);
  const [totalReceivedBytes, setTotalReceivedBytes] = useState(0);
  const [totalPreloaded, setTotalPreloaded] = useState(0);
  const [, forceRender] = useState(0);
  const topicStats = useRef(new TopicStatsMap());
  const rangeUnsubscribes = useRef<Map<string, () => void>>(new Map());

  const [panelState, setPanelState] = useState<PanelState>({
    ...DEFAULT_PANEL_STATE,
    ...(context.initialState as PanelState),
  });

  const actionHandler = useCallback(
    (action: SettingsTreeAction) => {
      setPanelState((prev) => {
        const result = handleSettingsAction(action, prev, availableTopics);
        if (result.resetStats) {
          topicStats.current.resetReceived();
        }
        return result.panelState;
      });
    },
    [availableTopics],
  );

  useEffect(() => {
    context.saveState(panelState);
    context.updatePanelSettingsEditor(
      buildSettingsTree(panelState, availableTopics, actionHandler),
    );
  }, [actionHandler, context, panelState, availableTopics]);

  useLayoutEffect(() => {
    setAvailableTopics(undefined);
    setColorScheme(undefined);
    setTotalReceived(0);
    topicStats.current.clear();
    for (const unsubscribe of rangeUnsubscribes.current.values()) {
      unsubscribe();
    }
    rangeUnsubscribes.current.clear();

    context.onRender = (renderState, done) => {
      setAvailableTopics(renderState.topics);
      setColorScheme(renderState.colorScheme);

      if (renderState.didSeek === true) {
        topicStats.current.resetReceived();
      }

      renderState.currentFrame?.forEach(({ topic, sizeInBytes }) => {
        const stats = topicStats.current.get(topic);
        stats.received++;
        stats.receivedBytes += sizeInBytes;
      });

      done();
    };

    context.watch("topics");
    context.watch("currentFrame");
    context.watch("colorScheme");
    context.watch("didSeek");
  }, [context]);

  const schemaByTopic = useMemo(() => {
    const map = new Map<string, string>();
    for (const { name, schemaName } of availableTopics ?? []) {
      map.set(name, schemaName);
    }
    return map;
  }, [availableTopics]);

  const subscribedTopics = useMemo(
    () =>
      Object.entries(panelState.subscriptions)
        .filter(([_, options]) => options?.visible ?? DEFAULT_VISIBLE)
        .map(([topic, options]) => ({
          topic,
          preload: options?.preload,
          datatype: schemaByTopic.get(topic),
        })),
    [panelState, schemaByTopic],
  );

  useEffect(() => {
    context.subscribe(subscribedTopics.map(({ topic }) => ({ topic })));
  }, [context, subscribedTopics]);

  useEffect(() => {
    if (context.subscribeMessageRange == undefined) {
      return;
    }

    const preloadAll = panelState.preloadAll === true;
    const wantedTopics = new Set(
      subscribedTopics
        .filter(({ preload }) => preloadAll || preload === true)
        .map(({ topic }) => topic),
    );

    for (const [topic, unsubscribe] of rangeUnsubscribes.current) {
      if (!wantedTopics.has(topic)) {
        unsubscribe();
        rangeUnsubscribes.current.delete(topic);
        topicStats.current.get(topic).preloaded = 0;
      }
    }

    for (const topic of wantedTopics) {
      if (rangeUnsubscribes.current.has(topic)) {
        continue;
      }

      const unsubscribe = context.subscribeMessageRange({
        topic,
        onNewRangeIterator: async (batchIterator: AsyncIterable<Immutable<MessageEvent[]>>) => {
          const stats = topicStats.current.get(topic);
          stats.preloaded = 0;
          stats.preloading = true;
          for await (const batch of batchIterator) {
            stats.preloaded += batch.length;
          }
          stats.preloading = false;
        },
      });
      rangeUnsubscribes.current.set(topic, unsubscribe);
    }
  }, [context, panelState.preloadAll, subscribedTopics]);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: colorScheme ?? "light",
        },
      }),
    [colorScheme],
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTotalReceived(topicStats.current.totalReceived());
      setTotalReceivedBytes(topicStats.current.totalReceivedBytes());
      setTotalPreloaded(topicStats.current.totalPreloaded());
      forceRender((n) => n + 1);
    }, 500);
    return () => {
      clearInterval(interval);
    };
  }, []);

  const rows: TopicRow[] = subscribedTopics.map(({ topic, datatype }) => {
    const stats = topicStats.current.get(topic);
    return {
      topic,
      datatype,
      received: stats.received,
      receivedBytes: stats.receivedBytes,
      preloaded: stats.preloaded,
      preloading: stats.preloading,
    };
  });

  return (
    <ThemeProvider theme={theme}>
      <Stack
        spacing={1}
        sx={{ padding: "0.5em 0", position: "relative", height: "100%", width: "100%" }}
      >
        <TopicTable
          rows={rows}
          totalReceived={totalReceived}
          totalReceivedBytes={totalReceivedBytes}
          totalPreloaded={totalPreloaded}
        />
      </Stack>
    </ThemeProvider>
  );
}

export function initSubscriptionTestPanel(context: PanelExtensionContext): () => void {
  const root = createRoot(context.panelElement);
  root.render(<SubscriptionTestPanel context={context} />);
  return () => {
    root.unmount();
  };
}
