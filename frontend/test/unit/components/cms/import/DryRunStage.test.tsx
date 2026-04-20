import { describe, expect, it, afterEach, vi, type Mock } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { QueryClientProvider } from "@tanstack/react-query";

import messages from "../../../../../src/messages/en.json";
import { createTestQueryClient } from "../../../../utils/query-client";

// ── Hook mocks (hoisted) ──────────────────────────────────────────────

const mockUseImportSession = vi.fn();
const mockUseImportRows = vi.fn();

vi.mock("@/hooks/api/useImport", () => ({
    useImportSession: (id: string) => mockUseImportSession(id),
    useImportRows: (sessionId: string, params?: unknown) => mockUseImportRows(sessionId, params),
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

    it("renders the table with rows and opens the drawer placeholder on row click", async () => {
        setupDefaultMocks();
        renderDryRunStage();

        const tableRows = screen.getAllByRole("button", { name: "Open" });
        expect(tableRows).toHaveLength(2);
        expect(screen.getAllByText("Will create").length).toBeGreaterThanOrEqual(1);

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

        const openButtons = screen.getAllByRole("button", { name: "Open" });
        await userEvent.click(openButtons[0]);

        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByRole("dialog")).toHaveTextContent("Row #1 drawer placeholder");
    });
});
