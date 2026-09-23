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

console.log("JSDOM setup complete");
