export type PanelState = {
  preloadAll?: boolean;
  subscriptions: Record<string, { visible?: boolean; preload?: boolean } | undefined>;
};

export type TopicStats = {
  received: number;
  receivedBytes: number;
  preloaded: number;
  preloading: boolean;
};
