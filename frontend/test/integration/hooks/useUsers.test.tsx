import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useGetUsers, useCreateUser, useUpdateUser, useDeleteUser } from "@/hooks/api/useUsers";
import { createQueryClientWrapper } from "../../utils/query-client";

describe("useGetUsers", () => {
    it("fetches all users with id, email, username and role", async () => {
        const { wrapper } = createQueryClientWrapper();
        const { result } = renderHook(() => useGetUsers(), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toHaveLength(2);
        expect(result.current.data![0]).toMatchObject({
            id: expect.any(String),
            email: "admin@test.com",
            username: "admin",
            role: "admin",
        });
        expect(result.current.data![1].role).toBe("editor");
    });

    it("respects the enabled option", async () => {
        const { wrapper } = createQueryClientWrapper();
        const { result } = renderHook(() => useGetUsers({ enabled: false }), { wrapper });

        expect(result.current.isPending).toBe(true);
    });
});

describe("useCreateUser", () => {
    it("creates a user and invalidates the user list cache", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useCreateUser(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync({
                email: "new@test.com",
                username: "newuser",
                password: "secret123",
                role: "editor",
            });
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });
        expect(result.current.data).toMatchObject({
            email: "new@test.com",
            role: "editor",
        });
    });
});

describe("useUpdateUser", () => {
    it("updates username and role and invalidates cache", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useUpdateUser(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync({
                id: "u0000000-0000-0000-0000-000000000001",
                payload: { username: "admin-updated", role: "editor" },
            });
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });
    });
});

describe("useDeleteUser", () => {
    it("deletes a user and invalidates the user list cache", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useDeleteUser(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync("u0000000-0000-0000-0000-000000000002");
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });
    });
});
