import { describe, expect, it, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { QueryClientProvider } from "@tanstack/react-query";

import messages from "../../../../../src/messages/en.json";
import { createTestQueryClient } from "../../../../utils/query-client";
import { FkPicker } from "@/components/cms/import/FkPicker";
import type { FieldSpec, ImportRow } from "@/types/models/import.types";

const SESSION_ID = "session-abc";

function makeRow(resolvedRefs: Record<string, unknown> = {}): ImportRow {
    return {
        id: "row-1",
        sessionId: SESSION_ID,
        rowNumber: 1,
        status: "will_create",
        rawData: {},
        overrides: {},
        resolvedRefs,
        diff: null,
        warnings: [],
        targetEntityId: null,
    };
}

const artistFkField: FieldSpec = {
    name: "artist_id",
    label: "Artist",
    required: false,
    uniqueLookup: false,
    fieldType: { kind: "foreign_key", target: "artist", matchField: "slug" },
};

function renderFkPicker(row: ImportRow, fkFields: FieldSpec[], onChangeRef = vi.fn()) {
    const queryClient = createTestQueryClient();
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <QueryClientProvider client={queryClient}>
                <FkPicker row={row} fkFields={fkFields} onChangeRef={onChangeRef} />
            </QueryClientProvider>
        </NextIntlClientProvider>
    );
}

describe("FkPicker", () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it("renders nothing when fkFields is empty", () => {
        const row = makeRow();
        const { container } = renderFkPicker(row, []);
        expect(container).toBeEmptyDOMElement();
    });

    it("prefills input with existing resolved ref and calls onChangeRef on blur", async () => {
        const onChangeRef = vi.fn();
        const row = makeRow({ artist_id: "some-uuid-1234" });
        renderFkPicker(row, [artistFkField], onChangeRef);

        const input = screen.getByRole("textbox");
        expect(input).toHaveValue("some-uuid-1234");

        fireEvent.change(input, { target: { value: "new-uuid-5678" } });
        fireEvent.blur(input);

        expect(onChangeRef).toHaveBeenCalledOnce();
        expect(onChangeRef).toHaveBeenCalledWith("artist_id", "new-uuid-5678");
    });

    it("calls onChangeRef with null when Clear button is clicked", async () => {
        const onChangeRef = vi.fn();
        const row = makeRow({ artist_id: "some-uuid-1234" });
        renderFkPicker(row, [artistFkField], onChangeRef);

        const clearButton = screen.getByRole("button", { name: "Clear" });
        await userEvent.click(clearButton);

        expect(onChangeRef).toHaveBeenCalledOnce();
        expect(onChangeRef).toHaveBeenCalledWith("artist_id", null);
    });
});
