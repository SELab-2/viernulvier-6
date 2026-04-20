import { describe, expect, it, afterEach, vi, type Mock } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { QueryClientProvider } from "@tanstack/react-query";

import messages from "../../../../../src/messages/en.json";
import { createTestQueryClient } from "../../../../utils/query-client";

// ── Hook mocks (hoisted) ──────────────────────────────────────────────

const mockUpdateMappingMutate = vi.fn();
const mockStartDryRunMutate = vi.fn();

const mockUseImportSession = vi.fn();
const mockUseFieldSpec = vi.fn();
const mockUseImportRows = vi.fn();

vi.mock("@/hooks/api/useImport", () => ({
    useImportSession: (id: string) => mockUseImportSession(id),
    useFieldSpec: (entityType: string, options?: unknown) => mockUseFieldSpec(entityType, options),
    useImportRows: (sessionId: string, params?: unknown) => mockUseImportRows(sessionId, params),
    useUpdateMapping: () => ({
        mutate: mockUpdateMappingMutate,
        isPending: false,
        isError: false,
    }),
    useStartDryRun: () => ({
        mutate: mockStartDryRunMutate,
        isPending: false,
        isError: false,
    }),
}));

// ── Radix Select mock — replaces with a plain <select> for JSDOM compatibility ──

vi.mock("@/components/ui/select", () => ({
    Select: ({
        children,
        onValueChange,
        value,
    }: {
        children: React.ReactNode;
        onValueChange?: (v: string) => void;
        value?: string;
    }) => (
        <select value={value ?? ""} onChange={(e) => onValueChange?.(e.target.value)}>
            {children}
        </select>
    ),
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectValue: () => null,
    SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
        <option value={value}>{children}</option>
    ),
}));

// Import component after mocks
import { MappingStage } from "@/components/cms/import/MappingStage";

// ── Fixtures ──────────────────────────────────────────────────────────

const SESSION_ID = "session-abc";

const defaultSession = {
    id: SESSION_ID,
    entityType: "production",
    filename: "productions.csv",
    originalHeaders: ["Titel", "Genre"],
    mapping: { columns: {} },
    status: "mapping",
    rowCount: 5,
    createdBy: "user-1",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    committedAt: null,
    error: null,
};

const defaultFields = [
    {
        name: "title_nl",
        label: "Titel",
        required: true,
        uniqueLookup: false,
        fieldType: { kind: "string" as const },
    },
    {
        name: "genre",
        label: "Genre",
        required: false,
        uniqueLookup: false,
        fieldType: { kind: "string" as const },
    },
];

const defaultRows = [
    {
        id: "row-1",
        sessionId: SESSION_ID,
        rowNumber: 1,
        status: "pending" as const,
        rawData: { Titel: "Hamlet", Genre: "Theatre" },
        overrides: {},
        resolvedRefs: {},
        diff: null,
        warnings: [],
        targetEntityId: null,
    },
];

function setupDefaultMocks() {
    (mockUseImportSession as Mock).mockReturnValue({
        data: defaultSession,
        isPending: false,
        isError: false,
    });
    (mockUseFieldSpec as Mock).mockReturnValue({
        data: defaultFields,
        isPending: false,
        isError: false,
    });
    (mockUseImportRows as Mock).mockReturnValue({
        data: defaultRows,
    });
}

function renderMappingStage(sessionId = SESSION_ID) {
    const queryClient = createTestQueryClient();
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <QueryClientProvider client={queryClient}>
                <MappingStage sessionId={sessionId} />
            </QueryClientProvider>
        </NextIntlClientProvider>
    );
}

// ── Tests ─────────────────────────────────────────────────────────────

describe("MappingStage", () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it("renders the mapping title", () => {
        setupDefaultMocks();
        renderMappingStage();
        expect(screen.getByText("Map columns")).toBeInTheDocument();
    });

    it("renders a row for each header", () => {
        setupDefaultMocks();
        renderMappingStage();
        // Headers appear as <p> elements in table cells
        const headers = screen.getAllByText("Titel");
        expect(headers.length).toBeGreaterThanOrEqual(1);
        // "Genre" appears in the column header cell and as a select option label — just verify presence
        expect(screen.getAllByText("Genre").length).toBeGreaterThanOrEqual(1);
    });

    it("auto-suggests legacy header Titel → title_nl on first render", async () => {
        setupDefaultMocks();
        renderMappingStage();

        await waitFor(() => {
            const selects = screen.getAllByRole("combobox");
            // First select corresponds to "Titel" — should be seeded to title_nl
            expect(selects[0]).toHaveValue("title_nl");
        });
    });

    it("auto-suggests Genre → genre on first render", async () => {
        setupDefaultMocks();
        renderMappingStage();

        await waitFor(() => {
            const selects = screen.getAllByRole("combobox");
            expect(selects[1]).toHaveValue("genre");
        });
    });

    it("does not overwrite an existing saved mapping", async () => {
        (mockUseImportSession as Mock).mockReturnValue({
            data: {
                ...defaultSession,
                mapping: { columns: { Titel: "genre", Genre: null } },
            },
            isPending: false,
            isError: false,
        });
        (mockUseFieldSpec as Mock).mockReturnValue({
            data: defaultFields,
            isPending: false,
            isError: false,
        });
        (mockUseImportRows as Mock).mockReturnValue({ data: defaultRows });

        renderMappingStage();

        await waitFor(() => {
            const selects = screen.getAllByRole("combobox");
            // Saved mapping had Titel → genre, should be preserved
            expect(selects[0]).toHaveValue("genre");
        });
    });

    it("shows required-missing banner when a required field is unmapped", async () => {
        // Session has no mapping — auto-suggest will run, but if "Titel" header is absent
        // the required field title_nl won't be mapped
        (mockUseImportSession as Mock).mockReturnValue({
            data: {
                ...defaultSession,
                originalHeaders: ["SomethingUnrelated"],
                mapping: { columns: {} },
            },
            isPending: false,
            isError: false,
        });
        (mockUseFieldSpec as Mock).mockReturnValue({
            data: defaultFields,
            isPending: false,
            isError: false,
        });
        (mockUseImportRows as Mock).mockReturnValue({ data: [] });

        renderMappingStage();

        await waitFor(() => {
            expect(screen.getByRole("alert")).toBeInTheDocument();
        });

        expect(screen.getByRole("alert")).toHaveTextContent("Required fields not yet mapped");
    });

    it("start-dry-run button is disabled when required fields are unmapped", async () => {
        (mockUseImportSession as Mock).mockReturnValue({
            data: {
                ...defaultSession,
                originalHeaders: ["SomethingUnrelated"],
                mapping: { columns: {} },
            },
            isPending: false,
            isError: false,
        });
        (mockUseFieldSpec as Mock).mockReturnValue({
            data: defaultFields,
            isPending: false,
            isError: false,
        });
        (mockUseImportRows as Mock).mockReturnValue({ data: [] });

        renderMappingStage();

        await waitFor(() => {
            const dryRunBtn = screen.getByRole("button", { name: "Start dry-run" });
            expect(dryRunBtn).toBeDisabled();
        });
    });

    it("save button fires useUpdateMapping.mutate with current columns", async () => {
        setupDefaultMocks();
        renderMappingStage();

        // Wait for auto-suggest to seed
        await waitFor(() => {
            const selects = screen.getAllByRole("combobox");
            expect(selects[0]).toHaveValue("title_nl");
        });

        const saveButton = screen.getByRole("button", { name: "Save mapping" });
        await userEvent.click(saveButton);

        await waitFor(() => {
            expect(mockUpdateMappingMutate).toHaveBeenCalledOnce();
        });

        const call = mockUpdateMappingMutate.mock.calls[0][0];
        expect(call.id).toBe(SESSION_ID);
        expect(call.mapping.columns["Titel"]).toBe("title_nl");
        expect(call.mapping.columns["Genre"]).toBe("genre");
    });

    it("shows session load error when session fails", () => {
        (mockUseImportSession as Mock).mockReturnValue({
            data: undefined,
            isPending: false,
            isError: true,
        });
        (mockUseFieldSpec as Mock).mockReturnValue({
            data: undefined,
            isPending: false,
            isError: false,
        });
        (mockUseImportRows as Mock).mockReturnValue({ data: undefined });

        renderMappingStage();

        expect(screen.getByRole("alert")).toHaveTextContent("Could not load session.");
    });
});
