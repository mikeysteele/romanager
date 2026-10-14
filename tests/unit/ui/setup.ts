import { JSDOM } from "jsdom";

const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`, {
    url: "http://localhost/",
    pretendToBeVisual: true,
});

const g = globalThis as unknown as Record<string, unknown>;

g.window = dom.window;
g.document = dom.window.document;
g.HTMLElement = dom.window.HTMLElement;
g.customElements = dom.window.customElements;
g.Event = dom.window.Event;
g.CustomEvent = dom.window.CustomEvent;
g.Node = dom.window.Node;
g.HTMLDialogElement = dom.window.HTMLDialogElement;
g.addEventListener = dom.window.addEventListener.bind(dom.window);
g.removeEventListener = dom.window.removeEventListener.bind(dom.window);
g.dispatchEvent = dom.window.dispatchEvent.bind(dom.window);

// Shim HTMLDialogElement showModal and close for JSDOM
if (dom.window.HTMLDialogElement) {
    dom.window.HTMLDialogElement.prototype.showModal = function(this: HTMLDialogElement) {
        this.open = true;
    };
    dom.window.HTMLDialogElement.prototype.close = function(this: HTMLDialogElement) {
        this.open = false;
        this.dispatchEvent(new dom.window.Event('close'));
    };
}

// Mock fetch
g.fetch = () => Promise.resolve(new Response());

// Mock location for lit-router
g.location = {
    pathname: "/",
    search: "",
    hash: "",
    origin: "http://localhost",
    href: "http://localhost/"
};

// Shims for Lit (JSDOM lacks requestAnimationFrame)
g.requestAnimationFrame = (callback: FrameRequestCallback) => setTimeout(callback, 16);
g.cancelAnimationFrame = (id: number) => clearTimeout(id);

// Mock EventSource for JSDOM
type EventListenerFn = (e: unknown) => void;

class MockEventSource {
    url: string;
    onmessage: ((e: MessageEvent) => void) | null = null;
    onerror: ((e: Event) => void) | null = null;
    listeners = new Map<string, EventListenerFn[]>();
    constructor(url: string) {
        this.url = url;
    }
    addEventListener(type: string, fn: EventListenerFn) {
        const list = this.listeners.get(type) || [];
        list.push(fn);
        this.listeners.set(type, list);
    }
    removeEventListener(type: string, fn: EventListenerFn) {
        const list = this.listeners.get(type) || [];
        this.listeners.set(type, list.filter(f => f !== fn));
    }
    close() {}
}
g.EventSource = MockEventSource;

console.log("JSDOM setup complete");
