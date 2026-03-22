import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { queryKeys } from "@/hooks/api";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/query-client";
import { server } from "../../msw/server";
import { apiUrl } from "../../utils/env";

describe("api response interceptor", () => {
    beforeEach(() => {
        queryClient.clear();
    });

    it("retries the original request after a successful refresh", async () => {
        let protectedRequestCount = 0;

        server.use(
            http.get(apiUrl("/protected-test"), () => {
                protectedRequestCount += 1;
                if (protectedRequestCount === 1) {
                    return HttpResponse.json({ message: "Unauthorized" }, { status: 401 });
                }

                return HttpResponse.json({ ok: true }, { status: 200 });
            }),
            http.post(apiUrl("/auth/refresh"), () => {
                return HttpResponse.json({ success: true, message: "refreshed" }, { status: 200 });
            })
        );

        const response = await api.get<{ ok: boolean }>("/protected-test");

        expect(response.data).toEqual({ ok: true });
        expect(protectedRequestCount).toBe(2);
    });

    it("clears user cache and rejects when refresh fails", async () => {
        queryClient.setQueryData(queryKeys.user, {
            id: "cached-user",
            email: "cached@example.com",
        });

        server.use(
            http.get(apiUrl("/protected-test-fail"), () => {
                return HttpResponse.json({ message: "Unauthorized" }, { status: 401 });
            }),
            http.post(apiUrl("/auth/refresh"), () => {
                return HttpResponse.json(
                    { success: false, message: "refresh failed" },
                    { status: 401 }
                );
            })
        );

        await expect(api.get("/protected-test-fail")).rejects.toBeDefined();
        expect(queryClient.getQueryData(queryKeys.user)).toBeUndefined();
    });

    it("queues concurrent failed requests during refresh", async () => {
        let refreshCalls = 0;
        let protectedCalls = 0;

        server.use(
            http.get(apiUrl("/protected-queue"), () => {
                protectedCalls += 1;
                if (protectedCalls <= 2) {
                    return HttpResponse.json({ message: "Unauthorized" }, { status: 401 });
                }

                return HttpResponse.json({ ok: true }, { status: 200 });
            }),
            http.post(apiUrl("/auth/refresh"), async () => {
                refreshCalls += 1;
                await new Promise((resolve) => setTimeout(resolve, 30));
                return HttpResponse.json({ success: true, message: "refreshed" }, { status: 200 });
            })
        );

        const [first, second] = await Promise.all([
            api.get<{ ok: boolean }>("/protected-queue"),
            api.get<{ ok: boolean }>("/protected-queue"),
        ]);

        expect(first.data).toEqual({ ok: true });
        expect(second.data).toEqual({ ok: true });
        expect(refreshCalls).toBe(1);
    });
});
