import { describe, expect, it, afterEach, vi, type Mock } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { QueryClientProvider } from "@tanstack/react-query";

import messages from "../../../../../src/messages/en.json";
import { createTestQueryClient } from "../../../../utils/query-client";

// ── Hook mocks (hoisted) ──────────────────────────────────────────────

const mockStartDryRunMutate = vi.fn();
const mockCommitImportMutate = vi.fn();
const mockUpdateRowMutate = vi.fn();

const mockUseImportSession = vi.fn();
const mockUseImportRows = vi.fn();
const mockUseFieldSpec = vi.fn();

vi.mock("@/hooks/api/useImport", () => ({
    useImportSession: (id: string) => mockUseImportSession(id),
    useImportRows: (sessionId: string, params?: unknown) => mockUseImportRows(sessionId, params),
    useFieldSpec: (entityType: string, options?: unknown) => mockUseFieldSpec(entityType, options),
    useStartDryRun: () => ({
        mutate: mockStartDryRunMutate,
        isPending: false,
        isError: false,
    }),
    useCommitImport: () => ({
        mutate: mockCommitImportMutate,
        isPending: false,
        isError: false,
    }),
    useUpdateRow: () => ({
        mutate: mockUpdateRowMutate,
        isPending: false,
        isError: false,
    }),
}));

// ── Radix Sheet mock — avoids portal/animation issues in JSDOM ──────────

vi.mock("@/components/ui/sheet", () => ({
    Sheet: ({
        open,
        children,
    }: {
        open: boolean;
        onOpenChange?: (open: boolean) => void;
        children: React.ReactNode;
    }) => (open ? <div data-testid="sheet">{children}</div> : null),
    SheetContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SheetHeader: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
    SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
    SheetClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Import component after mocks
import { DryRunStage } from "@/components/cms/import/DryRunStage";

// ── Fixtures ──────────────────────────────────────────────────────────

const SESSION_ID = "session-abc";

const defaultSession = {
    id: SESSION_ID,
    entityType: "production",
    filename: "productions.csv",
    originalHeaders: ["Titel"],
    mapping: { columns: {} },
    status: "dry_run_ready" as const,
    rowCount: 2,
    createdBy: "user-1",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    committedAt: null,
    error: null,
};

const defaultRows = [
    {
        id: "row-1",
        sessionId: SESSION_ID,
        rowNumber: 1,
        status: "will_create" as const,
        rawData: {},
        overrides: {},
        resolvedRefs: {},
        diff: null,
        warnings: [],
        targetEntityId: null,
    },
    {
        id: "row-2",
        sessionId: SESSION_ID,
        rowNumber: 2,
        status: "will_update" as const,
        rawData: {},
        overrides: {},
        resolvedRefs: {},
        diff: null,
        warnings: [],
        targetEntityId: "entity-abc-12345",
    },
];

const defaultFields = [
    {
        name: "title_nl",
        label: "Titel",
        required: true,
        uniqueLookup: false,
        fieldType: { kind: "string" as const },
    },
];

function setupDefaultMocks() {
    (mockUseImportSession as Mock).mockReturnValue({
        data: defaultSession,
        isPending: false,
        isError: false,
    });
    (mockUseImportRows as Mock).mockReturnValue({
        data: defaultRows,
        isPending: false,
        isError: false,
    });
    (mockUseFieldSpec as Mock).mockReturnValue({
        data: defaultFields,
        isPending: false,
        isError: false,
    });
}

function renderDryRunStage(sessionId = SESSION_ID) {
    const queryClient = createTestQueryClient();
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <QueryClientProvider client={queryClient}>
                <DryRunStage sessionId={sessionId} />
            </QueryClientProvider>
        </NextIntlClientProvider>
    );
}

// ── Tests ─────────────────────────────────────────────────────────────

describe("DryRunStage", () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it("renders the table with rows", () => {
        setupDefaultMocks();
        renderDryRunStage();

        const openButtons = screen.getAllByRole("button", { name: "Open" });
        expect(openButtons).toHaveLength(2);
        expect(screen.getAllByText("Will create").length).toBeGreaterThanOrEqual(1);
    });

    it("opens the row drawer when a row is clicked", async () => {
        setupDefaultMocks();
        renderDryRunStage();

        expect(screen.queryByTestId("sheet")).not.toBeInTheDocument();

        const openButtons = screen.getAllByRole("button", { name: "Open" });
        await userEvent.click(openButtons[0]);

        await waitFor(() => {
            expect(screen.getByTestId("sheet")).toBeInTheDocument();
        });
    });

    it("commit button fires useCommitImport.mutate after confirming dialog", async () => {
        setupDefaultMocks();
        renderDryRunStage();

        const commitButton = screen.getByRole("button", { name: "Commit" });
        expect(commitButton).not.toBeDisabled();

        // First click opens the confirmation dialog
        await userEvent.click(commitButton);

        // Confirm the dialog by clicking the CTA
        const confirmButton = await screen.findByRole("button", { name: "Import" });
        await userEvent.click(confirmButton);

        expect(mockCommitImportMutate).toHaveBeenCalledOnce();
        expect(mockCommitImportMutate).toHaveBeenCalledWith(SESSION_ID);
    });

    it("commit button is disabled when session has error rows", () => {
        (mockUseImportSession as Mock).mockReturnValue({
            data: defaultSession,
            isPending: false,
            isError: false,
        });
        (mockUseImportRows as Mock).mockReturnValue({
            data: [{ ...defaultRows[0], status: "error" as const }, defaultRows[1]],
            isPending: false,
            isError: false,
        });
        (mockUseFieldSpec as Mock).mockReturnValue({
            data: defaultFields,
            isPending: false,
            isError: false,
        });

        renderDryRunStage();

        const commitButton = screen.getByRole("button", { name: "Commit" });
        expect(commitButton).toBeDisabled();
    });

    it("re-run button fires useStartDryRun.mutate", async () => {
        setupDefaultMocks();
        renderDryRunStage();

        const rerunButton = screen.getByRole("button", { name: "Re-run dry-run" });
        expect(rerunButton).not.toBeDisabled();

        await userEvent.click(rerunButton);

        expect(mockStartDryRunMutate).toHaveBeenCalledOnce();
        expect(mockStartDryRunMutate).toHaveBeenCalledWith(SESSION_ID);
    });

    it("shows session load error when session fails", () => {
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
        (mockUseFieldSpec as Mock).mockReturnValue({
            data: undefined,
            isPending: false,
            isError: false,
        });

        renderDryRunStage();

        expect(screen.getByRole("alert")).toHaveTextContent("Could not load session.");
    });
});
