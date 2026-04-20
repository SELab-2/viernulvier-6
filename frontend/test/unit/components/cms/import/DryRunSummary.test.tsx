import { describe, expect, it, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

import messages from "../../../../../src/messages/en.json";
import { DryRunSummary } from "@/components/cms/import/DryRunSummary";
import type { ImportRow } from "@/types/models/import.types";

function makeRow(id: string, status: ImportRow["status"]): ImportRow {
    return {
        id,
        sessionId: "session-1",
        rowNumber: Number(id.split("-")[1]),
        status,
        rawData: {},
        overrides: {},
        resolvedRefs: {},
        diff: null,
        warnings: [],
        targetEntityId: null,
    };
}

function renderSummary(
    rows: ImportRow[],
    sessionStatus: ImportRow["status"] | "dry_run_pending" | "dry_run_ready" = "dry_run_ready"
) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <DryRunSummary
                rows={rows}
                sessionStatus={
                    sessionStatus as Parameters<typeof DryRunSummary>[0]["sessionStatus"]
                }
            />
        </NextIntlClientProvider>
    );
}

describe("DryRunSummary", () => {
    afterEach(() => cleanup());

    it("renders counts for a mix of statuses", () => {
        const rows: ImportRow[] = [
            makeRow("row-1", "will_create"),
            makeRow("row-2", "will_create"),
            makeRow("row-3", "will_update"),
            makeRow("row-4", "will_skip"),
            makeRow("row-5", "error"),
            makeRow("row-6", "error"),
        ];

        renderSummary(rows, "dry_run_ready");

        const cards = screen.getAllByText(/\d+/);
        const counts = cards.map((el) => el.textContent);
        expect(counts).toContain("2");
        expect(counts).toContain("1");

        expect(screen.getByText("Will create")).toBeInTheDocument();
        expect(screen.getByText("Will update")).toBeInTheDocument();
        expect(screen.getByText("Will skip")).toBeInTheDocument();
        expect(screen.getByText("Errors")).toBeInTheDocument();
    });

    it("shows progress bar when dry_run_pending, hides it otherwise", () => {
        const rows: ImportRow[] = [makeRow("row-1", "pending")];

        const { rerender } = render(
            <NextIntlClientProvider locale="en" messages={messages}>
                <DryRunSummary rows={rows} sessionStatus="dry_run_pending" />
            </NextIntlClientProvider>
        );

        expect(screen.getByRole("progressbar")).toBeInTheDocument();

        rerender(
            <NextIntlClientProvider locale="en" messages={messages}>
                <DryRunSummary rows={rows} sessionStatus="dry_run_ready" />
            </NextIntlClientProvider>
        );

        expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });
});
