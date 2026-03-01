type Listener = (data: unknown) => void;

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
        listener(data);
      }
    }
  }
}

export const eventBus = new EventBus();
