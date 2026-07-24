import type {
  ConfigEventCallback,
  ConfigEventPayloads,
  ConfigEventType,
  EventEmitterInterface,
} from "../types";

type Listener = (...args: unknown[]) => void;

export class TypedEventEmitter implements EventEmitterInterface {
  private listeners = new Map<ConfigEventType, Set<Listener>>();

  on<E extends ConfigEventType>(
    event: E,
    callback: ConfigEventCallback<E>,
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as Listener);
  }

  off<E extends ConfigEventType>(
    event: E,
    callback: ConfigEventCallback<E>,
  ): void {
    this.listeners.get(event)?.delete(callback as Listener);
  }

  emit<E extends ConfigEventType>(
    event: E,
    payload: ConfigEventPayloads[E],
  ): void {
    const callbacks = this.listeners.get(event);
    if (!callbacks) {
      return;
    }
    for (const cb of callbacks) {
      try {
        cb(payload);
      } catch (err) {
        console.error(`[Alpha] Event handler error for "${event}":`, err);
      }
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}
