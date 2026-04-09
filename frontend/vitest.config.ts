import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "jsdom",
        setupFiles: ["./test/setup.ts"],
        clearMocks: true,
        restoreMocks: true,
        server: {
            deps: {
                inline: ["next-intl"],
            },
        },
        exclude: [
            "**/node_modules/**",
            "**/dist/**",
            "**/cypress/**",
            "**/.{idea,git,cache,output,temp}/**",
            "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*",
            "./test/e2e/**",
        ],
        typecheck: {
            enabled: true,
            tsconfig: "./tsconfig.json",
        },
        coverage: {
            provider: "v8", // or 'istanbul'
            reporter: ["text", "lcov"],
            exclude: ["./test/e2e/**", "**/*.config.*", "**/*.d.ts"],
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
            "next/navigation": path.resolve(__dirname, "./node_modules/next/navigation.js"),
        },
    },
});
