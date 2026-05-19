import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ColumnDef, ExpandedState, Row } from "@tanstack/react-table";
import { NextIntlClientProvider } from "next-intl";
import { useMemo, useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { DataTable, MemoSubTable } from "@/app/[locale]/(cms)/cms/tables/data-table";
import { useParentChildSelection } from "@/app/[locale]/(cms)/cms/tables/use-parent-child-selection";
import messages from "@/messages/en.json";

type Parent = { id: string; label: string };
type Child = { id: string; label: string };

function PlainSelectionHarness() {
    const rows = useMemo<Parent[]>(
        () => [
            { id: "p1", label: "Production 1" },
            { id: "p2", label: "Production 2" },
            { id: "p3", label: "Production 3" },
            { id: "p4", label: "Production 4" },
        ],
        []
    );
    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
    const columns = useMemo<ColumnDef<Parent>[]>(
        () => [
            {
                accessorKey: "label",
                header: "Label",
                cell: ({ row }) => row.original.label,
            },
        ],
        []
    );

    return (
        <div>
            <div data-testid="plain-selected">{Object.keys(rowSelection).sort().join(",")}</div>
            <DataTable
                columns={columns}
                data={rows}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                getRowId={(row) => row.id}
            />
        </div>
    );
}

function SelectionHarness() {
    const parents = useMemo<Parent[]>(
        () => [
            { id: "p1", label: "Production 1" },
            { id: "p2", label: "Production 2" },
            { id: "p3", label: "Production 3" },
        ],
        []
    );
    const childrenByParent = useMemo(
        () =>
            new Map<string, Child[]>([
                ["p1", [{ id: "e1", label: "Event 1" }]],
                ["p2", [{ id: "e2", label: "Event 2" }]],
                ["p3", [{ id: "e3", label: "Event 3" }]],
            ]),
        []
    );
    const [expanded, setExpanded] = useState<ExpandedState>({ p1: true, p2: true, p3: true });

    const {
        parentSelection,
        setParentSelection,
        childSelection,
        childSelectionRef,
        getChildHandler,
        selectColumn,
        selectedParentCount,
        selectedChildCount,
        selectionVersion,
    } = useParentChildSelection<Parent>(childrenByParent);

    const parentColumns = useMemo<ColumnDef<Parent>[]>(
        () => [
            selectColumn,
            {
                accessorKey: "label",
                header: "Label",
                cell: ({ row }) => row.original.label,
            },
        ],
        [selectColumn]
    );

    const childColumns = useMemo<ColumnDef<Child>[]>(
        () => [
            {
                accessorKey: "label",
                header: "Label",
                cell: ({ row }) => row.original.label,
            },
        ],
        []
    );

    const renderChildren = (row: Row<Parent>) => {
        const parentId = row.original.id;
        return (
            <MemoSubTable
                items={childrenByParent.get(parentId) ?? []}
                columns={childColumns}
                rowSelection={childSelectionRef.current.get(parentId)}
                onRowSelectionChange={getChildHandler(parentId)}
                getRowId={(child) => child.id}
                rowRenderVersion={selectionVersion}
            />
        );
    };

    return (
        <div>
            <div data-testid="counts">
                {selectedParentCount}:{selectedChildCount}:{childSelection.size}
            </div>
            <DataTable
                columns={parentColumns}
                data={parents}
                rowSelection={parentSelection}
                onRowSelectionChange={setParentSelection}
                expanded={expanded}
                onExpandedChange={setExpanded}
                getRowId={(parent) => parent.id}
                getRowCanExpand={() => true}
                renderSubRows={renderChildren}
                rowRenderVersion={selectionVersion}
            />
        </div>
    );
}

function renderSelectionHarness() {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <SelectionHarness />
        </NextIntlClientProvider>
    );
}

afterEach(() => {
    cleanup();
});

describe("useParentChildSelection", () => {
    it("renders table headers with foreground text on the sticky background", () => {
        render(
            <NextIntlClientProvider locale="en" messages={messages}>
                <PlainSelectionHarness />
            </NextIntlClientProvider>
        );

        expect(screen.getByRole("columnheader", { name: "Label" })).toHaveClass("text-foreground");
    });

    it("replaces selection on plain row click when multiple rows are selected", () => {
        render(
            <NextIntlClientProvider locale="en" messages={messages}>
                <PlainSelectionHarness />
            </NextIntlClientProvider>
        );

        const checkboxes = screen.getAllByRole("checkbox");

        fireEvent.click(checkboxes[0]);
        fireEvent.click(checkboxes[1], { ctrlKey: true });
        fireEvent.click(checkboxes[2], { ctrlKey: true });
        expect(screen.getByTestId("plain-selected")).toHaveTextContent("p1,p2,p3");

        // Plain click on row text should replace selection, not toggle
        fireEvent.click(screen.getByText("Production 1"));

        expect(screen.getByTestId("plain-selected")).toHaveTextContent("p1");
    });

    it("deselects the ctrl-clicked row when multiple plain table rows are selected", () => {
        render(
            <NextIntlClientProvider locale="en" messages={messages}>
                <PlainSelectionHarness />
            </NextIntlClientProvider>
        );

        fireEvent.click(screen.getByText("Production 1"));
        fireEvent.click(screen.getByText("Production 2"), { ctrlKey: true });
        fireEvent.click(screen.getByText("Production 3"), { ctrlKey: true });
        expect(screen.getByTestId("plain-selected")).toHaveTextContent("p1,p2,p3");

        fireEvent.click(screen.getByText("Production 2"), { ctrlKey: true });

        expect(screen.getByTestId("plain-selected")).toHaveTextContent("p1,p3");
    });

    it("replaces selection on plain click and toggles with ctrl+click", () => {
        render(
            <NextIntlClientProvider locale="en" messages={messages}>
                <PlainSelectionHarness />
            </NextIntlClientProvider>
        );

        // Plain click selects only that row
        fireEvent.click(screen.getByText("Production 1"));
        expect(screen.getByTestId("plain-selected")).toHaveTextContent("p1");

        // Another plain click replaces
        fireEvent.click(screen.getByText("Production 2"));
        expect(screen.getByTestId("plain-selected")).toHaveTextContent("p2");

        // Ctrl+click toggles (adds row to selection)
        fireEvent.click(screen.getByText("Production 1"), { ctrlKey: true });
        fireEvent.click(screen.getByText("Production 3"), { ctrlKey: true });
        expect(screen.getByTestId("plain-selected")).toHaveTextContent("p1,p2,p3");

        // Ctrl+click toggles (removes row from selection)
        fireEvent.click(screen.getByText("Production 2"), { ctrlKey: true });
        expect(screen.getByTestId("plain-selected")).toHaveTextContent("p1,p3");
    });

    it("keeps parent and child selection in sync when the parent selector is clicked quickly", () => {
        renderSelectionHarness();

        const [parentCheckbox] = screen.getAllByRole("checkbox");

        fireEvent.click(parentCheckbox, { ctrlKey: true });
        fireEvent.click(parentCheckbox, { ctrlKey: true });

        expect(screen.getByTestId("counts")).toHaveTextContent("0:0:1");
        expect(parentCheckbox).toHaveAttribute("aria-checked", "false");
    });

    it("toggles the ctrl-clicked parent row without changing other selected parents", () => {
        renderSelectionHarness();

        let checkboxes = screen.getAllByRole("checkbox");

        fireEvent.click(checkboxes[0], { ctrlKey: true });
        fireEvent.click(checkboxes[2], { ctrlKey: true });
        fireEvent.click(checkboxes[4], { ctrlKey: true });
        expect(screen.getByTestId("counts")).toHaveTextContent("3:3:3");

        checkboxes = screen.getAllByRole("checkbox");
        fireEvent.click(checkboxes[2], { ctrlKey: true });

        checkboxes = screen.getAllByRole("checkbox");
        expect(screen.getByTestId("counts")).toHaveTextContent("2:2:3");
        expect(checkboxes[0]).toHaveAttribute("aria-checked", "true");
        expect(checkboxes[2]).toHaveAttribute("aria-checked", "false");
        expect(checkboxes[4]).toHaveAttribute("aria-checked", "true");
    });

    it("selects an inclusive parent and child range when shift-clicking parent checkboxes", () => {
        renderSelectionHarness();

        let checkboxes = screen.getAllByRole("checkbox");

        fireEvent.click(checkboxes[4], { ctrlKey: true });
        fireEvent.click(checkboxes[0], { shiftKey: true });

        checkboxes = screen.getAllByRole("checkbox");
        expect(screen.getByTestId("counts")).toHaveTextContent("3:3:3");
        expect(checkboxes[0]).toHaveAttribute("aria-checked", "true");
        expect(checkboxes[2]).toHaveAttribute("aria-checked", "true");
        expect(checkboxes[4]).toHaveAttribute("aria-checked", "true");
    });

    it("marks the parent selector as mixed when only a child row is selected", () => {
        renderSelectionHarness();

        const [, childCheckbox] = screen.getAllByRole("checkbox");

        fireEvent.click(childCheckbox);

        const [parentCheckbox, selectedChildCheckbox] = screen.getAllByRole("checkbox");
        expect(screen.getByTestId("counts")).toHaveTextContent("0:1:1");
        expect(parentCheckbox).toHaveAttribute("aria-checked", "mixed");
        expect(selectedChildCheckbox).toHaveAttribute("aria-checked", "true");
    });
});
