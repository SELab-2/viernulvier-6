import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LoginForm } from "@/components/auth/LoginForm";

const { replaceMock, useLoginMock, useUserMock } = vi.hoisted(() => ({
    replaceMock: vi.fn(),
    useLoginMock: vi.fn(),
    useUserMock: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
    useLogin: useLoginMock,
    useUser: useUserMock,
}));

vi.mock("@/i18n/routing", () => ({
    useRouter: () => ({
        replace: replaceMock,
    }),
}));

vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => key,
}));

describe("LoginForm", () => {
    beforeEach(() => {
        replaceMock.mockReset();
        useLoginMock.mockReset();
        useUserMock.mockReset();
        useLoginMock.mockReturnValue({
            mutate: vi.fn(),
            isPending: false,
            error: null,
            isError: false,
        });
        useUserMock.mockReturnValue({
            data: undefined,
            isLoading: false,
        });
    });

    it("redirects authenticated users away from the login page", async () => {
        useUserMock.mockReturnValue({
            data: {
                id: "editor-1",
                email: "editor@example.com",
                role: "editor",
            },
            isLoading: false,
        });

        render(<LoginForm />);

        await waitFor(() => {
            expect(replaceMock).toHaveBeenCalledWith("/cms");
        });
    });

    it("does not redirect anonymous users", () => {
        render(<LoginForm />);

        expect(replaceMock).not.toHaveBeenCalled();
    });
});
