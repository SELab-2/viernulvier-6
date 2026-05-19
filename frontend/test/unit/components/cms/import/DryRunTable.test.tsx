import { describe, expect, it, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";

import messages from "../../../../../src/messages/en.json";
import { DryRunTable } from "@/components/cms/import/DryRunTable";
import type { ImportRow, ImportMapping } from "@/types/models/import.types";

function makeRow(overrides: Partial<ImportRow> = {}): ImportRow {
    return {
        id: "row-1",
        sessionId: "session-1",
        rowNumber: 1,
        status: "will_create",
        rawData: {},
        overrides: {},
        resolvedRefs: {},
        diff: null,
        warnings: [],
        targetEntityId: null,
        ...overrides,
    };
}

const mapping: ImportMapping = { columns: { title: "title" } };

function renderTable(rows: ImportRow[], onSelectRow = vi.fn()) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <DryRunTable rows={rows} mapping={mapping} onSelectRow={onSelectRow} />
        </NextIntlClientProvider>
    );
}

describe("DryRunTable", () => {
    afterEach(() => cleanup());

    it("renders one table row per ImportRow with correct row number and status label", () => {
        const rows: ImportRow[] = [
            makeRow({ id: "row-1", rowNumber: 1, status: "will_create" }),
            makeRow({ id: "row-2", rowNumber: 2, status: "will_update" }),
            makeRow({ id: "row-3", rowNumber: 3, status: "will_skip" }),
        ];

        renderTable(rows);

        expect(screen.getByText("1")).toBeInTheDocument();
        expect(screen.getByText("2")).toBeInTheDocument();
        expect(screen.getByText("3")).toBeInTheDocument();

        expect(screen.getByText("Will create")).toBeInTheDocument();
        expect(screen.getByText("Will update")).toBeInTheDocument();
        expect(screen.getByText("Will skip")).toBeInTheDocument();
    });

    it("calls onSelectRow with the correct row when a row is clicked", async () => {
        const row1 = makeRow({ id: "row-1", rowNumber: 1, status: "will_create" });
        const row2 = makeRow({ id: "row-2", rowNumber: 2, status: "error" });
        const onSelectRow = vi.fn();

        renderTable([row1, row2], onSelectRow);

        const openButtons = screen.getAllByRole("button", { name: "Open" });
        await userEvent.click(openButtons[1]);

        expect(onSelectRow).toHaveBeenCalledOnce();
        expect(onSelectRow).toHaveBeenCalledWith(row2);
    });

    it("shows em-dash when row has no warnings", () => {
        renderTable([makeRow({ warnings: [] })]);
        // resolveRowLabel also renders "—" when no label field is found, so there may be multiple
        const dashes = screen.getAllByText("—");
        expect(dashes.length).toBeGreaterThanOrEqual(1);
        // The warnings em-dash is wrapped in a <span class="text-muted-foreground">
        const warningDash = dashes.find((el) => el.tagName === "SPAN");
        expect(warningDash).toBeInTheDocument();
    });

    it("shows warning code when row has one warning", () => {
        renderTable([makeRow({ warnings: [{ field: null, code: "WARN_001", message: "test" }] })]);
        expect(screen.getByText("WARN_001")).toBeInTheDocument();
    });

    it("shows code +N for multiple warnings", () => {
        const warnings = [
            { field: null, code: "WARN_001", message: "first" },
            { field: null, code: "WARN_002", message: "second" },
            { field: null, code: "WARN_003", message: "third" },
        ];
        renderTable([makeRow({ warnings })]);
        expect(screen.getByText("WARN_001")).toBeInTheDocument();
        expect(screen.getByText("+2")).toBeInTheDocument();
    });

    it("applies destructive border class on error rows", () => {
        const row = makeRow({ id: "err-row", status: "error" });
        renderTable([row]);
        const tableRows = screen.getAllByRole("row");
        // The data row is the second row (first is thead)
        expect(tableRows[1]).toHaveClass("border-l-destructive");
    });

    it("shows the resolved row label in the label column", () => {
        const row = makeRow({ rawData: { title: "Hamlet" } });
        const customMapping: ImportMapping = { columns: { title: "title" } };
        render(
            <NextIntlClientProvider locale="en" messages={messages}>
                <DryRunTable rows={[row]} mapping={customMapping} onSelectRow={vi.fn()} />
            </NextIntlClientProvider>
        );
        expect(screen.getByText("Hamlet")).toBeInTheDocument();
    });
});
