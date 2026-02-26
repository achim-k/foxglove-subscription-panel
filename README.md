# Subscription Test Panel

A [Foxglove](https://foxglove.dev) extension panel for subscribing to topics and monitoring message throughput.

## Features

- **Subscribe to topics** — toggle individual topic subscriptions via the settings sidebar. Use _Subscribe all_ / _Unsubscribe all_ actions to manage topics in bulk.
- **Preload messages** — enable per-topic preloading to fetch the full message range via `subscribeMessageRange`, or use the global _Preload all topics_ toggle. A spinner indicates when range loading is in progress.
- **Sortable table** — click any column header (Topic, Datatype, Received, Bytes, Preloaded) to sort ascending or descending. Long topic names and schema names are truncated with ellipsis and show a tooltip on hover.
- **Live stats** — received message counts, human-readable byte sizes, and preloaded counts update in real-time. A footer row shows the totals. Received stats reset automatically on seek.

## Develop

```sh
npm install
npm run build            # build the extension
npm run lint             # lint and auto-fix
npm run install          # install into Foxglove desktop
```

## Package & Publish

```sh
npm run package
```

This produces a `.foxe` file you can distribute or publish to the Foxglove marketplace.

See the [publishing docs](https://foxglove.dev/docs/studio/extensions/publish#packaging-your-extension) for details.
