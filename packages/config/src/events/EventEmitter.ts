import type {
  ConfigEventCallback,
  ConfigEventPayloads,
  ConfigEventType,
  EventEmitterInterface,
} from "../types.js";

type Listener = (...args: unknown[]) => void;

/**
 * TypedEventEmitter supports two event patterns:
 *
 * 1. Typed batch events (ConfigEventType):
 *      emitter.on("updated", ({ keys }) => ...)
 *      emitter.on("fetchError", ({ error }) => ...)
 *
 * 2. Key-specific events (template literal `updated:${key}`):
 *      emitter.on("updated:feature.dark_mode", (value) => ...)
 *    Fired individually per key alongside the batch "updated" event.
 */
export class TypedEventEmitter implements EventEmitterInterface {
  private listeners = new Map<string, Set<Listener>>();
  private keyListeners = new Map<string, Set<(value: unknown) => void>>();

  on<E extends ConfigEventType>(event: E, callback: ConfigEventCallback<E>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as Listener);
  }

  off<E extends ConfigEventType>(event: E, callback: ConfigEventCallback<E>): void {
    this.listeners.get(event)?.delete(callback as Listener);
  }

  /**
   * Subscribe to a key-specific update event.
   * Fires when that exact key's value is updated.
   *
   * @example
   * emitter.onKey("feature.dark_mode", (value) => applyTheme(value));
   */
  onKey(key: string, callback: (value: unknown) => void): void {
    if (!this.keyListeners.has(key)) {
      this.keyListeners.set(key, new Set());
    }
    this.keyListeners.get(key)!.add(callback);
  }

  offKey(key: string, callback: (value: unknown) => void): void {
    this.keyListeners.get(key)?.delete(callback);
  }

  emit<E extends ConfigEventType>(event: E, payload: ConfigEventPayloads[E]): void {
    // Fire batch listeners
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const cb of callbacks) {
        try {
          cb(payload);
        } catch (err) {
          console.error(`[config] Event handler error for "${event}":`, err);
        }
      }
    }

    // For "updated" events, also fire per-key listeners
    if (event === "updated") {
      const updatedPayload = payload as ConfigEventPayloads["updated"];
      for (const key of updatedPayload.keys) {
        const keyCallbacks = this.keyListeners.get(key);
        if (keyCallbacks) {
          for (const cb of keyCallbacks) {
            try {
              cb(key); // value is read from data store by the subscriber
            } catch (err) {
              console.error(`[config] Key listener error for "updated:${key}":`, err);
            }
          }
        }
      }
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
    this.keyListeners.clear();
  }
}
