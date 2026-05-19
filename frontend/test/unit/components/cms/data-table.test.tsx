import { describe, expect, it, afterEach, vi } from "vitest";
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { RowSelectionState, Updater } from "@tanstack/react-table";

vi.mock("@/i18n/routing", () => ({
    Link: ({
        children,
        href,
        ...rest
    }: {
        children: React.ReactNode;
        href: string;
        className?: string;
    }) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));

import { DataTable } from "@/app/[locale]/(cms)/cms/tables/data-table";
import { ColumnDef } from "@tanstack/react-table";

const messages = {
    Cms: {
        DataTable: {
            noResults: "Geen resultaten",
        },
    },
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <NextIntlClientProvider locale="nl" messages={messages}>
        {children}
    </NextIntlClientProvider>
);

interface Item {
    id: string;
    name: string;
}

const columns: ColumnDef<Item>[] = [{ accessorKey: "name", header: "Naam" }];

describe("DataTable", () => {
    afterEach(() => {
        cleanup();
    });

    it("renders no results message when data is empty", () => {
        render(<DataTable columns={columns} data={[]} />, { wrapper: TestWrapper });

        expect(screen.getByText("Geen resultaten")).toBeInTheDocument();
    });

    it("renders skeleton rows when loading is true and data is empty", () => {
        const { container } = render(<DataTable columns={columns} data={[]} loading />, {
            wrapper: TestWrapper,
        });

        const skeletons = container.querySelectorAll('[class*="bg-foreground/10"]');
        expect(skeletons.length).toBeGreaterThan(0);
        expect(screen.queryByText("Geen resultaten")).toBeNull();
    });

    it("renders rows with data", () => {
        const data: Item[] = [
            { id: "1", name: "Item One" },
            { id: "2", name: "Item Two" },
        ];

        render(<DataTable columns={columns} data={data} />, { wrapper: TestWrapper });

        expect(screen.getByText("Item One")).toBeInTheDocument();
        expect(screen.getByText("Item Two")).toBeInTheDocument();
    });

    it("renders column headers", () => {
        const data: Item[] = [{ id: "1", name: "Test" }];

        render(<DataTable columns={columns} data={data} />, { wrapper: TestWrapper });

        expect(screen.getByText("Naam")).toBeInTheDocument();
    });

    it("renders expander column when renderSubComponent is provided", () => {
        const data: Item[] = [{ id: "1", name: "Test" }];

        render(
            <DataTable
                columns={columns}
                data={data}
                renderSubComponent={() => <div>Sub content</div>}
                getRowCanExpand={() => true}
            />,
            { wrapper: TestWrapper }
        );

        const expandButtons = screen.getAllByRole("button");
        expect(expandButtons.length).toBeGreaterThan(0);
    });

    it("renders select column when onRowSelectionChange is provided", () => {
        const data: Item[] = [{ id: "1", name: "Test" }];

        render(
            <DataTable
                columns={columns}
                data={data}
                onRowSelectionChange={vi.fn()}
                rowSelection={{}}
            />,
            { wrapper: TestWrapper }
        );

        const checkboxes = screen.getAllByRole("checkbox");
        expect(checkboxes.length).toBeGreaterThan(0);
    });

    it("selects an inclusive range when shift-clicking row checkboxes upward", () => {
        const data: Item[] = [
            { id: "1", name: "Item One" },
            { id: "2", name: "Item Two" },
            { id: "3", name: "Item Three" },
            { id: "4", name: "Item Four" },
        ];

        function ControlledTable() {
            const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
            const handleRowSelectionChange = (updater: Updater<RowSelectionState>) => {
                setRowSelection((prev) =>
                    typeof updater === "function" ? updater(prev) : updater
                );
            };

            return (
                <DataTable
                    columns={columns}
                    data={data}
                    getRowId={(row) => row.id}
                    onRowSelectionChange={handleRowSelectionChange}
                    rowSelection={rowSelection}
                />
            );
        }

        render(<ControlledTable />, { wrapper: TestWrapper });

        const checkboxes = screen.getAllByRole("checkbox");
        fireEvent.click(checkboxes[3], { ctrlKey: true });
        fireEvent.click(checkboxes[1], { shiftKey: true });

        expect(checkboxes[0]).toHaveAttribute("aria-checked", "false");
        expect(checkboxes[1]).toHaveAttribute("aria-checked", "true");
        expect(checkboxes[2]).toHaveAttribute("aria-checked", "true");
        expect(checkboxes[3]).toHaveAttribute("aria-checked", "true");
    });

    it("does not render select column when onRowSelectionChange is not provided", () => {
        const data: Item[] = [{ id: "1", name: "Test" }];

        render(<DataTable columns={columns} data={data} />, { wrapper: TestWrapper });

        expect(screen.queryByRole("checkbox")).toBeNull();
    });

    it("renders compact variant without sticky headers", () => {
        const data: Item[] = [{ id: "1", name: "Test" }];

        render(<DataTable columns={columns} data={data} compact />, {
            wrapper: TestWrapper,
        });

        expect(screen.getByText("Test")).toBeInTheDocument();
    });
});
