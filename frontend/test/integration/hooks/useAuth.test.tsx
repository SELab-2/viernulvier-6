import { renderHook, waitFor, act } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { queryKeys } from "@/hooks/api";
import { useLogin, useLogout, useUser } from "@/hooks/useAuth";
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

    it("calls login endpoint and redirects to /cms on success", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        const { result } = renderHook(() => useLogin(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync({
                email: "admin@viernulvier.be",
                password: "password",
            });
        });

        expect(queryClient.getQueryData(queryKeys.user)).toBeUndefined();
        expect(pushMock).toHaveBeenCalledWith("/cms");
    });

    it("shows error toast on 401 response", async () => {
        server.use(
            http.post(apiUrl("/auth/login"), () => {
                return HttpResponse.json(
                    { success: false, message: "Unauthorized" },
                    { status: 401 }
                );
            })
        );

        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useLogin(), { wrapper });

        await act(async () => {
            await result.current
                .mutateAsync({
                    email: "wrong@viernulvier.be",
                    password: "wrong",
                })
                .catch(() => {});
        });

        expect(toastErrorMock).toHaveBeenCalledWith("errorInvalidCredentials");
    });

    it("shows generic error toast on non-401 error", async () => {
        server.use(
            http.post(apiUrl("/auth/login"), () => {
                return HttpResponse.json(
                    { success: false, message: "Server error" },
                    { status: 500 }
                );
            })
        );

        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useLogin(), { wrapper });

        await act(async () => {
            await result.current
                .mutateAsync({
                    email: "admin@viernulvier.be",
                    password: "password",
                })
                .catch(() => {});
        });

        expect(toastErrorMock).toHaveBeenCalledWith("errorGeneric");
    });
});

describe("useLogout", () => {
    beforeEach(() => {
        pushMock.mockReset();
        toastErrorMock.mockReset();
        toastSuccessMock.mockReset();
    });

    it("clears user query and redirects to /login on success", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        queryClient.setQueryData(queryKeys.user, {
            id: "4c4d5a6b-5e2a-4e59-aaf4-f8b432dbf0a0",
            email: "admin@viernulvier.be",
            role: "admin",
        });

        const { result } = renderHook(() => useLogout(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync();
        });

        expect(queryClient.getQueryData(queryKeys.user)).toBeUndefined();
        expect(pushMock).toHaveBeenCalledWith("/login");
        expect(toastSuccessMock).toHaveBeenCalledWith("loggedOut");
    });

    it("clears user query and redirects to /login even on error", async () => {
        server.use(
            http.post(apiUrl("/auth/logout"), () => {
                return HttpResponse.json({ success: false, message: "Error" }, { status: 500 });
            })
        );

        const { wrapper, queryClient } = createQueryClientWrapper();

        queryClient.setQueryData(queryKeys.user, {
            id: "4c4d5a6b-5e2a-4e59-aaf4-f8b432dbf0a0",
            email: "admin@viernulvier.be",
            role: "admin",
        });

        const { result } = renderHook(() => useLogout(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync().catch(() => {});
        });

        expect(queryClient.getQueryData(queryKeys.user)).toBeUndefined();
        expect(pushMock).toHaveBeenCalledWith("/login");
        expect(toastErrorMock).toHaveBeenCalledWith("errorGeneric");
    });
});
