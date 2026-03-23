import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { useCreateEditor } from "@/hooks/api";
import { server } from "../../msw/server";
import { apiUrl } from "../../utils/env";
import { createQueryClientWrapper } from "../../utils/query-client";

describe("useCreateEditor", () => {
    it("creates editor when authorized", async () => {
        const { wrapper } = createQueryClientWrapper();
        const { result } = renderHook(() => useCreateEditor(), { wrapper });

        result.current.mutate({
            username: "editor",
            email: "editor@example.com",
            password: "secret",
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual({
            id: "bb360abf-6728-4cfe-8b9a-79d0adfb3222",
            email: "new.editor@viernulvier.be",
            role: "editor",
        });
    });

    it("returns error for non-admin users", async () => {
        server.use(
            http.post(apiUrl("/editor/create"), () => {
                return HttpResponse.json(
                    { success: false, message: "Unauthorized" },
                    { status: 401 }
                );
            })
        );

        const { wrapper } = createQueryClientWrapper();
        const { result } = renderHook(() => useCreateEditor(), { wrapper });

        result.current.mutate({
            username: "editor",
            email: "editor@example.com",
            password: "secret",
        });

        await waitFor(() => {
            expect(result.current.isError).toBe(true);
        });
    });
});
