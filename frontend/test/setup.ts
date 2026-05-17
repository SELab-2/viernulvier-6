import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { loadEnvConfig } from "@next/env";

import { server } from "./msw/server";
import { getApiBaseUrl } from "./utils/env";

loadEnvConfig(process.cwd());

getApiBaseUrl();

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};

// Mock scrollIntoView (not implemented in jsdom, needed by cmdk)
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock pointer capture methods (needed by Radix UI Popover in jsdom)
window.HTMLElement.prototype.hasPointerCapture = vi.fn();
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();

beforeAll(() => {
    server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
    server.resetHandlers();
});

afterAll(() => {
    server.close();
});
