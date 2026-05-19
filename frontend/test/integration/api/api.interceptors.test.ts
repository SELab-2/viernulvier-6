import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { queryKeys } from "@/hooks/api";
import { api, refreshAuthSession } from "@/lib/api-client";
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
            http.get(apiUrl("/editor/me"), () => {
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

        const response = await api.get<{ ok: boolean }>("/editor/me");

        expect(response.data).toEqual({ ok: true });
        expect(protectedRequestCount).toBe(2);
    });

    it("refreshes public request failures without treating public pages as protected", async () => {
        let refreshCalls = 0;
        let publicRequestCount = 0;

        server.use(
            http.get(apiUrl("/productions/not-found"), () => {
                publicRequestCount += 1;
                if (publicRequestCount === 1) {
                    return HttpResponse.json({ message: "Unauthorized" }, { status: 401 });
                }

                return HttpResponse.json({ ok: true }, { status: 200 });
            }),
            http.post(apiUrl("/auth/refresh"), () => {
                refreshCalls += 1;
                return HttpResponse.json({ success: true, message: "refreshed" }, { status: 200 });
            })
        );

        const response = await api.get<{ ok: boolean }>("/productions/not-found");

        expect(response.data).toEqual({ ok: true });
        expect(publicRequestCount).toBe(2);
        expect(refreshCalls).toBe(1);
    });

    it("clears user cache and rejects when refresh fails", async () => {
        queryClient.setQueryData(queryKeys.user, {
            id: "cached-user",
            email: "cached@example.com",
        });

        server.use(
            http.get(apiUrl("/editor/me"), () => {
                return HttpResponse.json({ message: "Unauthorized" }, { status: 401 });
            }),
            http.post(apiUrl("/auth/refresh"), () => {
                return HttpResponse.json(
                    { success: false, message: "refresh failed" },
                    { status: 401 }
                );
            })
        );

        await expect(api.get("/editor/me")).rejects.toBeDefined();
        expect(queryClient.getQueryData(queryKeys.user)).toBeUndefined();
    });

    it("queues concurrent failed requests during refresh", async () => {
        let refreshCalls = 0;
        let protectedCalls = 0;

        server.use(
            http.get(apiUrl("/articles/cms/queue"), () => {
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
            api.get<{ ok: boolean }>("/articles/cms/queue"),
            api.get<{ ok: boolean }>("/articles/cms/queue"),
        ]);

        expect(first.data).toEqual({ ok: true });
        expect(second.data).toEqual({ ok: true });
        expect(refreshCalls).toBe(1);
    });

    it("shares one refresh request across direct refresh callers", async () => {
        let refreshCalls = 0;

        server.use(
            http.post(apiUrl("/auth/refresh"), async () => {
                refreshCalls += 1;
                await new Promise((resolve) => setTimeout(resolve, 30));
                return HttpResponse.json({ success: true, message: "refreshed" }, { status: 200 });
            })
        );

        await Promise.all([refreshAuthSession(), refreshAuthSession()]);

        expect(refreshCalls).toBe(1);
    });
});
