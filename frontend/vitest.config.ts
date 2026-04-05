import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "jsdom",
        setupFiles: ["./test/setup.ts"],
        clearMocks: true,
        restoreMocks: true,
        typecheck: {
            enabled: true,
            tsconfig: "./tsconfig.json",
        },
        coverage: {
            provider: "v8", // or 'istanbul'
            reporter: ["text", "lcov"],
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
