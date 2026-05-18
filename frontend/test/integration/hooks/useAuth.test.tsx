import { act, renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { queryKeys } from "@/hooks/api";
import { useLogin, useUser } from "@/hooks/useAuth";
import { api } from "@/lib/api-client";
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
            role: "admin",
        });

        const cachedUser = queryClient.getQueryData(queryKeys.user);
        expect(cachedUser).toEqual(result.current.data);
    });

    it("returns error state for unauthorized user requests", async () => {
        server.use(
            http.get(apiUrl("/editor/me"), () => {
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

describe("useLogin", () => {
    beforeEach(() => {
        pushMock.mockReset();
        toastErrorMock.mockReset();
        toastSuccessMock.mockReset();
    });

    it("aborts stale user checks before redirecting to the cms", async () => {
        let userRequestSignal: { aborted: boolean } | undefined;
        const apiGetSpy = vi.spyOn(api, "get");
        apiGetSpy.mockImplementation((url, config) => {
            if (url === "/editor/me") {
                userRequestSignal = config?.signal;
                return new Promise(() => {});
            }

            throw new Error(`Unexpected GET request: ${url}`);
        });

        server.use(
            http.post(apiUrl("/auth/login"), () => {
                return HttpResponse.json({ success: true, message: "Logged in" });
            })
        );

        const { wrapper } = createQueryClientWrapper();
        renderHook(() => useUser(), { wrapper });
        const login = renderHook(() => useLogin(), { wrapper });

        await waitFor(() => {
            expect(userRequestSignal).toBeDefined();
        });

        act(() => {
            login.result.current.mutate({
                email: "admin@viernulvier.be",
                password: "change-this-admin-password",
            });
        });

        await waitFor(() => {
            expect(userRequestSignal?.aborted).toBe(true);
        });
        await waitFor(() => {
            expect(pushMock).toHaveBeenCalledWith("/cms");
        });

        apiGetSpy.mockRestore();
    });
});
