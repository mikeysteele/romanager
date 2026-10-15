type Listener = (data: unknown) => unknown;

export class EventBus {
  private listeners: Record<string, Set<Listener>> = {};

  on(event: string, listener: Listener) {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set();
    }
    this.listeners[event].add(listener);
  }

  off(event: string, listener: Listener) {
    if (this.listeners[event]) {
      this.listeners[event].delete(listener);
    }
  }

  emit(event: string, data: unknown) {
    if (this.listeners[event]) {
      for (const listener of this.listeners[event]) {
        try {
          const res = listener(data);
          if (res && typeof (res as Promise<unknown>).catch === "function") {
            (res as Promise<unknown>).catch((err) => {
              console.error(`[EventBus] Uncaught async error in listener for "${event}":`, err);
            });
          }
        } catch (err) {
          console.error(`[EventBus] Error in listener for "${event}":`, err);
        }
      }
    }
  }
}

export const eventBus = new EventBus();
