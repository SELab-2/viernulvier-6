import { describe, expect, it, afterEach, vi, type Mock } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
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

// ── Sonner mock ───────────────────────────────────────────────────────────────

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock("sonner", () => ({
    toast: {
        success: (...args: unknown[]) => mockToastSuccess(...args),
        error: (...args: unknown[]) => mockToastError(...args),
    },
    Toaster: () => null,
}));

// ── Hook mocks (hoisted) ──────────────────────────────────────────────────────

const mockUseImportSession = vi.fn();
const mockUseImportRows = vi.fn();
const mockRevertRowMutate = vi.fn();
const mockRollbackSessionMutate = vi.fn();

vi.mock("@/hooks/api/useImport", () => ({
    useImportSession: (id: string) => mockUseImportSession(id),
    useImportRows: (sessionId: string) => mockUseImportRows(sessionId),
    useRevertRow: () => ({
        mutate: mockRevertRowMutate,
        isPending: false,
        isError: false,
    }),
    useRollbackSession: () => ({
        mutate: mockRollbackSessionMutate,
        isPending: false,
        isError: false,
    }),
}));

// Import component after mocks
import { HistoryDetail } from "@/components/cms/import/HistoryDetail";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SESSION_ID = "session-detail-1";

const defaultSession = {
    id: SESSION_ID,
    entityType: "production",
    filename: "productions.csv",
    originalHeaders: ["Titel"],
    mapping: { columns: {} },
    status: "committed" as const,
    rowCount: 2,
    createdBy: "user-1",
    createdAt: "2026-01-15T10:30:00Z",
    updatedAt: "2026-01-15T10:35:00Z",
    committedAt: "2026-01-15T10:36:00Z",
    error: null,
};

const rowWithTarget = {
    id: "row-1",
    sessionId: SESSION_ID,
    rowNumber: 1,
    status: "created" as const,
    rawData: {},
    overrides: {},
    resolvedRefs: {},
    diff: { slug: { current: "mijn-stuk", previous: null } },
    warnings: [],
    targetEntityId: "entity-abc-12345",
};

const rowWithoutTarget = {
    id: "row-2",
    sessionId: SESSION_ID,
    rowNumber: 2,
    status: "skipped" as const,
    rawData: {},
    overrides: {},
    resolvedRefs: {},
    diff: null,
    warnings: ["some warning"],
    targetEntityId: null,
};

const rowReverted = {
    id: "row-3",
    sessionId: SESSION_ID,
    rowNumber: 3,
    status: "reverted" as const,
    rawData: {},
    overrides: {},
    resolvedRefs: {},
    diff: null,
    warnings: [],
    targetEntityId: "entity-xyz-99999",
};

function renderHistoryDetail(sessionId = SESSION_ID) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <HistoryDetail sessionId={sessionId} />
        </NextIntlClientProvider>
    );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("HistoryDetail", () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it("renders loading skeletons while queries are pending", () => {
        (mockUseImportSession as Mock).mockReturnValue({
            data: undefined,
            isPending: true,
            isError: false,
        });
        (mockUseImportRows as Mock).mockReturnValue({
            data: undefined,
            isPending: true,
            isError: false,
        });

        renderHistoryDetail();

        const skeletons = document.querySelectorAll("[data-slot='skeleton']");
        expect(skeletons.length).toBeGreaterThan(0);
    });

    it("renders session header and row table when queries resolve", () => {
        (mockUseImportSession as Mock).mockReturnValue({
            data: defaultSession,
            isPending: false,
            isError: false,
        });
        (mockUseImportRows as Mock).mockReturnValue({
            data: [rowWithTarget, rowWithoutTarget],
            isPending: false,
            isError: false,
        });

        renderHistoryDetail();

        expect(screen.getByText("productions.csv")).toBeInTheDocument();
        expect(screen.getByText("production")).toBeInTheDocument();
        // Row numbers appear in the table rows
        const rowNumbers = screen.getAllByText("1");
        expect(rowNumbers.length).toBeGreaterThanOrEqual(1);
    });

    it("shows Edit in CMS and View on site links for rows with targetEntityId", () => {
        (mockUseImportSession as Mock).mockReturnValue({
            data: defaultSession,
            isPending: false,
            isError: false,
        });
        (mockUseImportRows as Mock).mockReturnValue({
            data: [rowWithTarget],
            isPending: false,
            isError: false,
        });

        renderHistoryDetail();

        const editLink = screen.getByRole("link", { name: "Edit in CMS" });
        expect(editLink).toHaveAttribute("href", "/cms/productions/entity-abc-12345/edit");

        const viewLink = screen.getByRole("link", { name: "View on site" });
        expect(viewLink).toHaveAttribute("href", "/productions/mijn-stuk");
    });

    it("shows em-dash when targetEntityId is null", () => {
        (mockUseImportSession as Mock).mockReturnValue({
            data: defaultSession,
            isPending: false,
            isError: false,
        });
        (mockUseImportRows as Mock).mockReturnValue({
            data: [rowWithoutTarget],
            isPending: false,
            isError: false,
        });

        renderHistoryDetail();

        expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("rollback button only visible when session.status is committed", () => {
        (mockUseImportSession as Mock).mockReturnValue({
            data: defaultSession,
            isPending: false,
            isError: false,
        });
        (mockUseImportRows as Mock).mockReturnValue({
            data: [rowWithTarget],
            isPending: false,
            isError: false,
        });

        renderHistoryDetail();

        expect(screen.getByRole("button", { name: /Rollback entire import/i })).toBeInTheDocument();
    });

    it("does not show rollback button when session is not committed", () => {
        (mockUseImportSession as Mock).mockReturnValue({
            data: { ...defaultSession, status: "failed" as const },
            isPending: false,
            isError: false,
        });
        (mockUseImportRows as Mock).mockReturnValue({
            data: [],
            isPending: false,
            isError: false,
        });

        renderHistoryDetail();

        expect(
            screen.queryByRole("button", { name: /Rollback entire import/i })
        ).not.toBeInTheDocument();
    });

    it("clicking rollback opens confirm dialog", async () => {
        (mockUseImportSession as Mock).mockReturnValue({
            data: defaultSession,
            isPending: false,
            isError: false,
        });
        (mockUseImportRows as Mock).mockReturnValue({
            data: [rowWithTarget],
            isPending: false,
            isError: false,
        });

        renderHistoryDetail();

        const rollbackButton = screen.getByRole("button", { name: /Rollback entire import/i });
        await userEvent.click(rollbackButton);

        await waitFor(() => {
            expect(screen.getByText("Rollback entire import?")).toBeInTheDocument();
        });
    });

    it("clicking Confirm in dialog calls useRollbackSession.mutate with sessionId", async () => {
        (mockUseImportSession as Mock).mockReturnValue({
            data: defaultSession,
            isPending: false,
            isError: false,
        });
        (mockUseImportRows as Mock).mockReturnValue({
            data: [rowWithTarget],
            isPending: false,
            isError: false,
        });

        renderHistoryDetail();

        const rollbackButton = screen.getByRole("button", { name: /Rollback entire import/i });
        await userEvent.click(rollbackButton);

        await waitFor(() => {
            expect(screen.getByText("Rollback entire import?")).toBeInTheDocument();
        });

        const confirmButton = screen.getByRole("button", { name: /^Rollback$/i });
        await userEvent.click(confirmButton);

        expect(mockRollbackSessionMutate).toHaveBeenCalledOnce();
        expect(mockRollbackSessionMutate).toHaveBeenCalledWith(SESSION_ID, expect.any(Object));
    });

    it("per-row Revert button is disabled for non-created/updated rows", () => {
        (mockUseImportSession as Mock).mockReturnValue({
            data: defaultSession,
            isPending: false,
            isError: false,
        });
        (mockUseImportRows as Mock).mockReturnValue({
            data: [rowReverted],
            isPending: false,
            isError: false,
        });

        renderHistoryDetail();

        const revertButton = screen.getByRole("button", { name: /^Revert$/i });
        expect(revertButton).toBeDisabled();
    });

    it("clicking Revert on a created row calls useRevertRow.mutate with correct payload", async () => {
        (mockUseImportSession as Mock).mockReturnValue({
            data: defaultSession,
            isPending: false,
            isError: false,
        });
        (mockUseImportRows as Mock).mockReturnValue({
            data: [rowWithTarget],
            isPending: false,
            isError: false,
        });

        renderHistoryDetail();

        const revertButton = screen.getByRole("button", { name: /^Revert$/i });
        expect(revertButton).not.toBeDisabled();
        await userEvent.click(revertButton);

        expect(mockRevertRowMutate).toHaveBeenCalledOnce();
        expect(mockRevertRowMutate).toHaveBeenCalledWith(
            { id: rowWithTarget.id, sessionId: SESSION_ID },
            expect.any(Object)
        );
    });

    it("renders error alert when session query fails", () => {
        (mockUseImportSession as Mock).mockReturnValue({
            data: undefined,
            isPending: false,
            isError: true,
        });
        (mockUseImportRows as Mock).mockReturnValue({
            data: undefined,
            isPending: false,
            isError: false,
        });

        renderHistoryDetail();

        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByRole("alert")).toHaveTextContent("Could not load session.");
    });

    it("renders error alert when rows query fails", () => {
        (mockUseImportSession as Mock).mockReturnValue({
            data: defaultSession,
            isPending: false,
            isError: false,
        });
        (mockUseImportRows as Mock).mockReturnValue({
            data: undefined,
            isPending: false,
            isError: true,
        });

        renderHistoryDetail();

        expect(screen.getByRole("alert")).toHaveTextContent("Could not load rows.");
    });

    it("clicking Revert on success calls toast.success with revert success message", async () => {
        (mockUseImportSession as Mock).mockReturnValue({
            data: defaultSession,
            isPending: false,
            isError: false,
        });
        (mockUseImportRows as Mock).mockReturnValue({
            data: [rowWithTarget],
            isPending: false,
            isError: false,
        });
        mockRevertRowMutate.mockImplementation(
            (_payload: unknown, options: { onSuccess?: () => void }) => {
                options.onSuccess?.();
            }
        );

        renderHistoryDetail();

        const revertButton = screen.getByRole("button", { name: /^Revert$/i });
        await userEvent.click(revertButton);

        expect(mockToastSuccess).toHaveBeenCalledOnce();
        expect(mockToastSuccess).toHaveBeenCalledWith("Row reverted");
    });

    it("clicking Revert on error calls toast.error with revert failed message", async () => {
        (mockUseImportSession as Mock).mockReturnValue({
            data: defaultSession,
            isPending: false,
            isError: false,
        });
        (mockUseImportRows as Mock).mockReturnValue({
            data: [rowWithTarget],
            isPending: false,
            isError: false,
        });
        mockRevertRowMutate.mockImplementation(
            (_payload: unknown, options: { onError?: () => void }) => {
                options.onError?.();
            }
        );

        renderHistoryDetail();

        const revertButton = screen.getByRole("button", { name: /^Revert$/i });
        await userEvent.click(revertButton);

        expect(mockToastError).toHaveBeenCalledOnce();
        expect(mockToastError).toHaveBeenCalledWith("Could not revert row.");
    });

    it("confirming rollback on success calls toast.success with rollback success message", async () => {
        (mockUseImportSession as Mock).mockReturnValue({
            data: defaultSession,
            isPending: false,
            isError: false,
        });
        (mockUseImportRows as Mock).mockReturnValue({
            data: [rowWithTarget],
            isPending: false,
            isError: false,
        });
        mockRollbackSessionMutate.mockImplementation(
            (_sessionId: unknown, options: { onSuccess?: () => void }) => {
                options.onSuccess?.();
            }
        );

        renderHistoryDetail();

        const rollbackButton = screen.getByRole("button", { name: /Rollback entire import/i });
        await userEvent.click(rollbackButton);

        await waitFor(() => {
            expect(screen.getByText("Rollback entire import?")).toBeInTheDocument();
        });

        const confirmButton = screen.getByRole("button", { name: /^Rollback$/i });
        await userEvent.click(confirmButton);

        expect(mockToastSuccess).toHaveBeenCalledOnce();
        expect(mockToastSuccess).toHaveBeenCalledWith("Import rolled back");
    });

    it("confirming rollback on error calls toast.error with rollback failed message", async () => {
        (mockUseImportSession as Mock).mockReturnValue({
            data: defaultSession,
            isPending: false,
            isError: false,
        });
        (mockUseImportRows as Mock).mockReturnValue({
            data: [rowWithTarget],
            isPending: false,
            isError: false,
        });
        mockRollbackSessionMutate.mockImplementation(
            (_sessionId: unknown, options: { onError?: () => void }) => {
                options.onError?.();
            }
        );

        renderHistoryDetail();

        const rollbackButton = screen.getByRole("button", { name: /Rollback entire import/i });
        await userEvent.click(rollbackButton);

        await waitFor(() => {
            expect(screen.getByText("Rollback entire import?")).toBeInTheDocument();
        });

        const confirmButton = screen.getByRole("button", { name: /^Rollback$/i });
        await userEvent.click(confirmButton);

        expect(mockToastError).toHaveBeenCalledOnce();
        expect(mockToastError).toHaveBeenCalledWith("Could not rollback import.");
    });
});
