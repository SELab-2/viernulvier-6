import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { queryKeys } from "@/hooks/api";
import { useUser } from "@/hooks/useAuth";
import { server } from "../../msw/server";
import { apiUrl } from "../../utils/env";
import { createQueryClientWrapper } from "../../utils/query-client";

const { pushMock, toastErrorMock, toastSuccessMock } = vi.hoisted(() => {
    return {
        pushMock: vi.fn(),
        toastErrorMock: vi.fn(),
        toastSuccessMock: vi.fn(),
    };
});

vi.mock("@/i18n/routing", () => ({
    useRouter: () => ({
        push: pushMock,
    }),
}));

vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => key,
}));

vi.mock("sonner", () => ({
    toast: {
        error: toastErrorMock,
        success: toastSuccessMock,
    },
}));

describe("useUser", () => {
    beforeEach(() => {
        pushMock.mockReset();
        toastErrorMock.mockReset();
        toastSuccessMock.mockReset();
    });

    it("fetches authenticated user and maps it to domain model", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        const { result } = renderHook(() => useUser(), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual({
            id: "4c4d5a6b-5e2a-4e59-aaf4-f8b432dbf0a0",
            email: "admin@viernulvier.be",
        });

        const cachedUser = queryClient.getQueryData(queryKeys.user);
        expect(cachedUser).toEqual(result.current.data);
    });

    it("returns error state for unauthorized user requests", async () => {
        server.use(
            http.get(apiUrl("/admin/me"), () => {
                return HttpResponse.json(
                    {
                        success: false,
                        message: "Unauthorized",
                    },
                    { status: 401 }
                );
            })
        );

        const { wrapper } = createQueryClientWrapper();
        const { result } = renderHook(() => useUser(), { wrapper });

        await waitFor(() => {
            expect(result.current.isError).toBe(true);
        });

        expect(result.current.error).toBeDefined();
    });
});
