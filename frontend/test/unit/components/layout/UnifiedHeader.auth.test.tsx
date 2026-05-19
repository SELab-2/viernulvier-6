import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UnifiedHeader } from "@/components/layout/header/UnifiedHeader";

const { useUserMock, useLogoutMock, pathnameMock } = vi.hoisted(() => ({
    useUserMock: vi.fn(),
    useLogoutMock: vi.fn(),
    pathnameMock: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
    useUser: useUserMock,
    useLogout: useLogoutMock,
}));

vi.mock("@/i18n/routing", () => ({
    Link: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
        <a href={String(href)} {...props}>
            {children}
        </a>
    ),
    usePathname: pathnameMock,
}));

vi.mock("next/link", () => ({
    default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
        <a href={String(href)} {...props}>
            {children}
        </a>
    ),
}));

vi.mock("next-intl", async () => {
    const actual = await vi.importActual<typeof import("next-intl")>("next-intl");
    return {
        ...actual,
        useTranslations: () => (key: string) => key,
    };
});

vi.mock("@/components/shared/theme-switcher", () => ({
    ThemeSwitcher: () => <button type="button">theme</button>,
}));

vi.mock("@/components/shared/locale-switcher-links", () => ({
    LocaleSwitcherLinks: () => <div>locale</div>,
}));

describe("UnifiedHeader auth check", () => {
    beforeEach(() => {
        useUserMock.mockReset();
        useLogoutMock.mockReset();
        pathnameMock.mockReset();
        useLogoutMock.mockReturnValue({ mutate: vi.fn() });
        useUserMock.mockReturnValue({ data: undefined });
    });

    it("does not request the editor session on public pages", () => {
        pathnameMock.mockReturnValue("/search");

        render(<UnifiedHeader />);

        expect(useUserMock).toHaveBeenCalledWith({ enabled: false });
    });

    it("does not make a nested editor session request when a cached user exists on public pages", () => {
        pathnameMock.mockReturnValue("/search");
        useUserMock.mockReturnValue({
            data: {
                id: "editor-1",
                email: "editor@example.com",
                role: "editor",
            },
        });

        render(<UnifiedHeader />);

        expect(useUserMock).toHaveBeenCalledTimes(1);
        expect(useUserMock).toHaveBeenCalledWith({ enabled: false });
    });

    it("requests the editor session on CMS pages", () => {
        pathnameMock.mockReturnValue("/cms/articles");

        render(<UnifiedHeader />);

        expect(useUserMock).toHaveBeenCalledWith({ enabled: true });
    });
});
