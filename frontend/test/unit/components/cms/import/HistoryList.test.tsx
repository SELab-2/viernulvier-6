import { describe, expect, it, afterEach, vi, type Mock } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";

import messages from "../../../../../src/messages/en.json";

// ── Router mock (hoisted) ────────────────────────────────────────────────────

vi.mock("@/i18n/routing", () => ({
    useRouter: () => ({ push: vi.fn() }),
    Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
        <a href={href}>{children}</a>
    ),
    redirect: vi.fn(),
    usePathname: vi.fn(),
}));

// ── Hook mocks (hoisted) ──────────────────────────────────────────────────────

const mockUseImportSessions = vi.fn();

vi.mock("@/hooks/api/useImport", () => ({
    useImportSessions: (params?: unknown) => mockUseImportSessions(params),
}));

// Import component after mocks
import { HistoryList } from "@/components/cms/import/HistoryList";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeSession = (id: string) => ({
    id,
    entityType: "production",
    filename: `file-${id}.csv`,
    originalHeaders: [],
    mapping: { columns: {} },
    status: "committed" as const,
    rowCount: 42,
    createdBy: "user-1",
    createdAt: "2026-01-15T10:30:00Z",
    updatedAt: "2026-01-15T10:35:00Z",
    committedAt: "2026-01-15T10:36:00Z",
    error: null,
});

const defaultSessions = [makeSession("s1"), makeSession("s2"), makeSession("s3")];

function renderHistoryList() {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <HistoryList />
        </NextIntlClientProvider>
    );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("HistoryList", () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it("renders table rows when useImportSessions returns data", () => {
        (mockUseImportSessions as Mock).mockReturnValue({
            data: defaultSessions,
            isPending: false,
            isError: false,
        });

        renderHistoryList();

        expect(screen.getByText("file-s1.csv")).toBeInTheDocument();
        expect(screen.getByText("file-s2.csv")).toBeInTheDocument();
        expect(screen.getByText("file-s3.csv")).toBeInTheDocument();
        const openLinks = screen.getAllByRole("link", { name: "Open" });
        expect(openLinks).toHaveLength(3);
        expect(openLinks[0]).toHaveAttribute("href", "/cms/import/history/s1");
    });

    it("renders skeleton rows while loading", () => {
        (mockUseImportSessions as Mock).mockReturnValue({
            data: undefined,
            isPending: true,
            isError: false,
        });

        renderHistoryList();

        const skeletons = document.querySelectorAll("[data-slot='skeleton']");
        expect(skeletons.length).toBeGreaterThan(0);
        expect(screen.queryByText("file-s1.csv")).not.toBeInTheDocument();
    });

    it("renders empty state when data is empty on page 1", () => {
        (mockUseImportSessions as Mock).mockReturnValue({
            data: [],
            isPending: false,
            isError: false,
        });

        renderHistoryList();

        expect(screen.getByText("No import sessions yet.")).toBeInTheDocument();
    });

    it("Previous button is disabled on page 1", () => {
        (mockUseImportSessions as Mock).mockReturnValue({
            data: defaultSessions,
            isPending: false,
            isError: false,
        });

        renderHistoryList();

        const prevButton = screen.getByRole("button", { name: "Previous" });
        expect(prevButton).toBeDisabled();
    });

    it("clicking Next advances the page and calls hook with page 2", async () => {
        (mockUseImportSessions as Mock).mockReturnValue({
            data: Array.from({ length: 20 }, (_, i) => makeSession(`s${i}`)),
            isPending: false,
            isError: false,
        });

        renderHistoryList();

        const nextButton = screen.getByRole("button", { name: "Next" });
        await userEvent.click(nextButton);

        expect(mockUseImportSessions).toHaveBeenCalledWith({ page: 2, limit: 20 });
    });

    it("renders error alert when useImportSessions returns an error", () => {
        (mockUseImportSessions as Mock).mockReturnValue({
            data: undefined,
            isPending: false,
            isError: true,
        });

        renderHistoryList();

        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByRole("alert")).toHaveTextContent("Could not load import history.");
    });
});
