import { TopicStats } from "./types";

export class TopicStatsMap {
  readonly #map = new Map<string, TopicStats>();

  get(topic: string): TopicStats {
    let stats = this.#map.get(topic);
    if (!stats) {
      stats = { received: 0, receivedBytes: 0, preloaded: 0, preloading: false };
      this.#map.set(topic, stats);
    }
    return stats;
  }

  clear(): void {
    this.#map.clear();
  }

  resetReceived(): void {
    for (const stats of this.#map.values()) {
      stats.received = 0;
      stats.receivedBytes = 0;
    }
  }

  totalReceived(): number {
    let total = 0;
    for (const stats of this.#map.values()) {
      total += stats.received;
    }
    return total;
  }

  totalReceivedBytes(): number {
    let total = 0;
    for (const stats of this.#map.values()) {
      total += stats.receivedBytes;
    }
    return total;
  }

  totalPreloaded(): number {
    let total = 0;
    for (const stats of this.#map.values()) {
      total += stats.preloaded;
    }
    return total;
  }
}
