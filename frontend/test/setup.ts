import { afterAll, afterEach, beforeAll } from "vitest";
import { loadEnvConfig } from "@next/env";

import { server } from "./msw/server";
import { getApiBaseUrl } from "./utils/env";

loadEnvConfig(process.cwd());

getApiBaseUrl();

beforeAll(() => {
    server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
    server.resetHandlers();
});

afterAll(() => {
    server.close();
});
