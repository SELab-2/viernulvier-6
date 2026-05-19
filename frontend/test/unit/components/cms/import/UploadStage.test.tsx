import { describe, expect, it, afterEach, vi, type Mock } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { QueryClientProvider } from "@tanstack/react-query";

import messages from "../../../../../src/messages/en.json";
import { createTestQueryClient } from "../../../../utils/query-client";

// ── Hook mocks (hoisted) ──────────────────────────────────────────────

const mockMutateAsync = vi.fn().mockResolvedValue({ sessionId: "session-uuid-1" });
const mockEntityTypes = vi.fn(() => ({
    data: ["production", "artist"],
    isPending: false,
    isError: false,
}));

vi.mock("@/hooks/api/useImport", () => ({
    useEntityTypes: () => mockEntityTypes(),
    useCreateImportSession: () => ({
        mutateAsync: mockMutateAsync,
        isPending: false,
        error: null,
    }),
}));

// ── Router mock ───────────────────────────────────────────────────────

const mockPush = vi.fn();

vi.mock("@/i18n/routing", () => ({
    useRouter: () => ({ push: mockPush }),
    Link: ({ children }: { children: React.ReactNode }) => children,
    redirect: vi.fn(),
    usePathname: vi.fn(),
}));

// ── Radix Select mock — replaces with a plain <select> for JSDOM compatibility ──

vi.mock("@/components/ui/select", () => ({
    Select: ({
        children,
        onValueChange,
        value,
        disabled,
    }: {
        children: React.ReactNode;
        onValueChange?: (v: string) => void;
        value?: string;
        disabled?: boolean;
    }) => (
        <select
            role="combobox"
            value={value ?? ""}
            disabled={disabled}
            onChange={(e) => onValueChange?.(e.target.value)}
            data-testid="entity-type-select"
        >
            {children}
        </select>
    ),
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectValue: ({ placeholder }: { placeholder?: string }) => (
        <option value="" disabled>
            {placeholder}
        </option>
    ),
    SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
        <option value={value}>{children}</option>
    ),
}));

// Import component after mocks are declared so vitest hoisting applies
import { UploadStage } from "@/components/cms/import/UploadStage";

// ── Render helper ─────────────────────────────────────────────────────

function renderUploadStage() {
    const queryClient = createTestQueryClient();

    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <QueryClientProvider client={queryClient}>
                <UploadStage />
            </QueryClientProvider>
        </NextIntlClientProvider>
    );
}

// ── Tests ─────────────────────────────────────────────────────────────

describe("UploadStage", () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
        (mockEntityTypes as Mock).mockReturnValue({
            data: ["production", "artist"],
            isPending: false,
            isError: false,
        });
    });

    it("renders the upload title", () => {
        renderUploadStage();

        expect(screen.getByText("Upload CSV file")).toBeInTheDocument();
    });

    it("renders the submit button disabled when nothing is selected", () => {
        renderUploadStage();

        const button = screen.getByRole("button", { name: "Create session" });
        expect(button).toBeDisabled();
    });

    it("shows a skeleton and no combobox while entity types are loading", () => {
        (mockEntityTypes as Mock).mockReturnValue({
            data: undefined,
            isPending: true,
            isError: false,
        });

        renderUploadStage();

        // Skeleton rendered; no select trigger present
        expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    });

    it("renders the entity type select when types have loaded", () => {
        renderUploadStage();

        expect(screen.getByRole("combobox")).toBeInTheDocument();
        expect(screen.getByRole("combobox")).not.toBeDisabled();
    });

    it("submit button remains disabled when only a file is selected (no entity type)", async () => {
        renderUploadStage();

        const fileInput = screen.getByTestId("csv-file-input");
        const file = new File(["a,b\n1,2"], "test.csv", { type: "text/csv" });
        await userEvent.upload(fileInput, file);

        const button = screen.getByRole("button", { name: "Create session" });
        expect(button).toBeDisabled();
    });

    it("submit button remains disabled when only an entity type is selected (no file)", async () => {
        renderUploadStage();

        await userEvent.selectOptions(screen.getByRole("combobox"), "production");

        const button = screen.getByRole("button", { name: "Create session" });
        expect(button).toBeDisabled();
    });

    it("submit button is enabled when both file and entity type are selected", async () => {
        renderUploadStage();

        await userEvent.selectOptions(screen.getByRole("combobox"), "production");

        const fileInput = screen.getByTestId("csv-file-input");
        const file = new File(["a,b\n1,2"], "test.csv", { type: "text/csv" });
        await userEvent.upload(fileInput, file);

        const button = screen.getByRole("button", { name: "Create session" });
        expect(button).not.toBeDisabled();
    });

    it("shows file-too-large error when a file exceeding 20MB is selected", async () => {
        renderUploadStage();

        const bigFile = new File(["x"], "big.csv", { type: "text/csv" });
        Object.defineProperty(bigFile, "size", { value: 21 * 1024 * 1024 });

        const fileInput = screen.getByTestId("csv-file-input");
        await userEvent.upload(fileInput, bigFile);

        await waitFor(() => {
            expect(screen.getByRole("alert")).toBeInTheDocument();
        });

        expect(screen.getByRole("alert")).toHaveTextContent("File too large (max 20MB).");
    });

    it("shows entityTypesFailed error when entity types cannot be loaded", () => {
        (mockEntityTypes as Mock).mockReturnValue({
            data: undefined,
            isPending: false,
            isError: true,
        });

        renderUploadStage();

        expect(screen.getByRole("alert")).toHaveTextContent("Could not load entity types.");
    });

    it("fires the mutation with correct args and navigates on success", async () => {
        renderUploadStage();

        await userEvent.selectOptions(screen.getByRole("combobox"), "production");

        const fileInput = screen.getByTestId("csv-file-input");
        const file = new File(["a,b\n1,2"], "test.csv", { type: "text/csv" });
        await userEvent.upload(fileInput, file);

        const button = screen.getByRole("button", { name: "Create session" });
        await userEvent.click(button);

        await waitFor(() => {
            expect(mockMutateAsync).toHaveBeenCalledOnce();
        });

        const call = mockMutateAsync.mock.calls[0][0];
        expect(call.entityType).toBe("production");
        expect(call.file).toBe(file);

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith("/cms/import?session=session-uuid-1");
        });
    });
});
