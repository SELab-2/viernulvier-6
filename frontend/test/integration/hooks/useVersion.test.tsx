import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { useGetVersion } from "@/hooks/api/useVersion";
import { server } from "../../msw/server";
import { apiUrl } from "../../utils/env";
import { createQueryClientWrapper } from "../../utils/query-client";

describe("useGetVersion", () => {
    it("fetches the API version string", async () => {
        server.use(
            http.get(apiUrl("/version"), () => {
                return HttpResponse.json("1.0.0", { status: 200 });
            })
        );

        const { wrapper } = createQueryClientWrapper();
        const { result } = renderHook(() => useGetVersion(), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toBe("1.0.0");
    });

    it("respects the enabled option when false", async () => {
        server.use(
            http.get(apiUrl("/version"), () => {
                return HttpResponse.json("2.0.0", { status: 200 });
            })
        );

        const { wrapper } = createQueryClientWrapper();
        const { result } = renderHook(() => useGetVersion({ enabled: false }), { wrapper });

        expect(result.current.isPending).toBe(true);
        expect(result.current.fetchStatus).toBe("idle");
    });
});
