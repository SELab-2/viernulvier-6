import { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { useState } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { DataTable } from "@/app/[locale]/(cms)/cms/tables/data-table";
import messages from "@/messages/en.json";

type RowData = {
    id: string;
    name: string;
};

const columns: ColumnDef<RowData>[] = [
    {
        accessorKey: "name",
        header: "Name",
    },
];

const rows: RowData[] = [
    { id: "1", name: "Alpha" },
    { id: "2", name: "Beta" },
    { id: "3", name: "Gamma" },
];

function SelectableTable() {
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

    return (
        <NextIntlClientProvider locale="en" messages={messages}>
            <DataTable
                columns={columns}
                data={rows}
                rowSelection={rowSelection}
                onRowSelectionChange={(updater) => {
                    setRowSelection((prev) =>
                        typeof updater === "function" ? updater(prev) : updater
                    );
                }}
                getRowId={(row) => row.id}
            />
        </NextIntlClientProvider>
    );
}

beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
});

describe("DataTable selection", () => {
    it("extends selection with shift-click on row checkboxes", async () => {
        const user = userEvent.setup();
        render(<SelectableTable />);

        const checkboxes = screen.getAllByRole("checkbox", { name: "Select row" });

        await user.click(checkboxes[0]);
        expect(checkboxes[0]).toHaveAttribute("aria-checked", "true");
        expect(checkboxes[1]).toHaveAttribute("aria-checked", "false");
        expect(checkboxes[2]).toHaveAttribute("aria-checked", "false");

        fireEvent.click(checkboxes[2], { shiftKey: true });

        expect(checkboxes[0]).toHaveAttribute("aria-checked", "true");
        expect(checkboxes[1]).toHaveAttribute("aria-checked", "true");
        expect(checkboxes[2]).toHaveAttribute("aria-checked", "true");
    });
});
