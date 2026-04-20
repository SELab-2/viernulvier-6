import { describe, expect, it, afterEach, vi, type Mock } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { QueryClientProvider } from "@tanstack/react-query";

import messages from "../../../../../src/messages/en.json";
import { createTestQueryClient } from "../../../../utils/query-client";

// ── Router mock (hoisted) ────────────────────────────────────────────────────

const mockRouterPush = vi.fn();

vi.mock("@/i18n/routing", () => ({
    useRouter: () => ({ push: mockRouterPush }),
    Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
        <a href={href}>{children}</a>
    ),
    redirect: vi.fn(),
    usePathname: vi.fn(),
}));

// ── Hook mocks (hoisted) ──────────────────────────────────────────────────────

const mockUseImportSession = vi.fn();

vi.mock("@/hooks/api/useImport", () => ({
    useImportSession: (id: string, options?: unknown) => mockUseImportSession(id, options),
}));

// Import component after mocks
import { CommitStage } from "@/components/cms/import/CommitStage";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SESSION_ID = "session-commit-123";

function renderCommitStage(sessionId = SESSION_ID) {
    const queryClient = createTestQueryClient();
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <QueryClientProvider client={queryClient}>
                <CommitStage sessionId={sessionId} />
            </QueryClientProvider>
        </NextIntlClientProvider>
    );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("CommitStage", () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it("renders spinner and running message when status is committing", () => {
        (mockUseImportSession as Mock).mockReturnValue({
            data: {
                id: SESSION_ID,
                status: "committing",
                error: null,
            },
            isPending: false,
            isError: false,
        });

        renderCommitStage();

        expect(screen.getByRole("status")).toBeInTheDocument();
        expect(screen.getByText("Import is running...")).toBeInTheDocument();
    });

    it("calls router.push with the history detail path when status is committed", async () => {
        (mockUseImportSession as Mock).mockReturnValue({
            data: {
                id: SESSION_ID,
                status: "committed",
                error: null,
            },
            isPending: false,
            isError: false,
        });

        renderCommitStage();

        await waitFor(() => {
            expect(mockRouterPush).toHaveBeenCalledOnce();
            expect(mockRouterPush).toHaveBeenCalledWith(`/cms/import/history/${SESSION_ID}`);
        });
    });

    it("renders error alert when status is failed", () => {
        (mockUseImportSession as Mock).mockReturnValue({
            data: {
                id: SESSION_ID,
                status: "failed",
                error: "Something went wrong",
            },
            isPending: false,
            isError: false,
        });

        renderCommitStage();

        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText("The import failed.")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Back to review" })).toBeInTheDocument();
    });

    it("renders session load error when query fails", () => {
        (mockUseImportSession as Mock).mockReturnValue({
            data: undefined,
            isPending: false,
            isError: true,
        });

        renderCommitStage();

        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText("Could not load session.")).toBeInTheDocument();
    });
});
