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

function SelectionHarness() {
    const parents = useMemo<Parent[]>(() => [{ id: "p1", label: "Production 1" }], []);
    const childrenByParent = useMemo(
        () => new Map<string, Child[]>([["p1", [{ id: "e1", label: "Event 1" }]]]),
        []
    );
    const [expanded, setExpanded] = useState<ExpandedState>({ p1: true });

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
    it("keeps parent and child selection in sync when the parent selector is clicked quickly", () => {
        renderSelectionHarness();

        const [parentCheckbox] = screen.getAllByRole("checkbox");

        fireEvent.click(parentCheckbox);
        fireEvent.click(parentCheckbox);

        expect(screen.getByTestId("counts")).toHaveTextContent("0:0:1");
        expect(parentCheckbox).toHaveAttribute("aria-checked", "false");
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
