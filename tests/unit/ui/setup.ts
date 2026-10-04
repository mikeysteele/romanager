import { JSDOM } from "jsdom";

const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`, {
    url: "http://localhost/",
    pretendToBeVisual: true,
});

(globalThis as any).window = dom.window;
(globalThis as any).document = dom.window.document;
(globalThis as any).HTMLElement = dom.window.HTMLElement;
(globalThis as any).customElements = dom.window.customElements;
(globalThis as any).Event = dom.window.Event;
(globalThis as any).CustomEvent = dom.window.CustomEvent;
(globalThis as any).Node = dom.window.Node;
(globalThis as any).HTMLDialogElement = dom.window.HTMLDialogElement;

// Shim HTMLDialogElement showModal and close for JSDOM
if (dom.window.HTMLDialogElement) {
    dom.window.HTMLDialogElement.prototype.showModal = function(this: any) {
        this.open = true;
    };
    dom.window.HTMLDialogElement.prototype.close = function(this: any) {
        this.open = false;
        this.dispatchEvent(new dom.window.Event('close'));
    };
}

// Mock fetch
(globalThis as any).fetch = () => Promise.resolve(new Response());

// Mock location for lit-router
(globalThis as any).location = {
    pathname: "/",
    search: "",
    hash: "",
    origin: "http://localhost",
    href: "http://localhost/"
};

// Shims for Lit (JSDOM lacks requestAnimationFrame)
(globalThis as any).requestAnimationFrame = (callback: any) => setTimeout(callback, 16);
(globalThis as any).cancelAnimationFrame = (id: any) => clearTimeout(id);

// Mock EventSource for JSDOM
class MockEventSource {
    url: string;
    onmessage: ((e: any) => void) | null = null;
    onerror: ((e: any) => void) | null = null;
    listeners = new Map<string, Function[]>();
    constructor(url: string) {
        this.url = url;
    }
    addEventListener(type: string, fn: Function) {
        const list = this.listeners.get(type) || [];
        list.push(fn);
        this.listeners.set(type, list);
    }
    removeEventListener(type: string, fn: Function) {
        const list = this.listeners.get(type) || [];
        this.listeners.set(type, list.filter(f => f !== fn));
    }
    close() {}
}
(globalThis as any).EventSource = MockEventSource;

console.log("JSDOM setup complete");
