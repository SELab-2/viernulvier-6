import { describe, expect, it, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { QueryClientProvider } from "@tanstack/react-query";

import messages from "../../../../../src/messages/en.json";
import { createTestQueryClient } from "../../../../utils/query-client";
import { DiffView } from "@/components/cms/import/DiffView";
import type { ImportRow } from "@/types/models/import.types";

const SESSION_ID = "session-abc";

function makeRow(diff: ImportRow["diff"]): ImportRow {
    return {
        id: "row-1",
        sessionId: SESSION_ID,
        rowNumber: 1,
        status: "will_update",
        rawData: {},
        overrides: {},
        resolvedRefs: {},
        diff,
        warnings: [],
        targetEntityId: null,
    };
}

function renderDiffView(row: ImportRow, onChangeField = vi.fn()) {
    const queryClient = createTestQueryClient();
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <QueryClientProvider client={queryClient}>
                <DiffView row={row} onChangeField={onChangeField} />
            </QueryClientProvider>
        </NextIntlClientProvider>
    );
}

describe("DiffView", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    it("renders both changed fields with current and incoming values", () => {
        const row = makeRow({
            title_nl: { current: "Oud", incoming: "Nieuw" },
            genre: { current: "Drama", incoming: "Komedie" },
        });

        renderDiffView(row);

        expect(screen.getByText("title_nl")).toBeInTheDocument();
        expect(screen.getByText("Oud")).toBeInTheDocument();

        expect(screen.getByText("genre")).toBeInTheDocument();
        expect(screen.getByText("Drama")).toBeInTheDocument();

        const inputs = screen.getAllByRole("textbox");
        const inputValues = inputs.map((i) => (i as HTMLInputElement).value);
        expect(inputValues).toContain("Nieuw");
        expect(inputValues).toContain("Komedie");
    });

    it("calls onChangeField after debounce when input is edited", async () => {
        const onChangeField = vi.fn();
        const row = makeRow({
            title_nl: { current: "Oud", incoming: "Nieuw" },
        });

        renderDiffView(row, onChangeField);

        const input = screen.getByRole("textbox");
        fireEvent.change(input, { target: { value: "Aangepast" } });
        fireEvent.blur(input);

        expect(onChangeField).not.toHaveBeenCalled();

        vi.advanceTimersByTime(400);

        expect(onChangeField).toHaveBeenCalledOnce();
        expect(onChangeField).toHaveBeenCalledWith("title_nl", "Aangepast");
    });

    it("shows no-changes message when diff is null", () => {
        const row = makeRow(null);
        renderDiffView(row);
        expect(screen.getByText("No changes.")).toBeInTheDocument();
    });
});
