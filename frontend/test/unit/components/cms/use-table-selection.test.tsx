import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Row } from "@tanstack/react-table";

import { useTableSelection } from "@/app/[locale]/(cms)/cms/tables/use-table-selection";

function makeRow(id: string): Row<unknown> {
    return { id } as Row<unknown>;
}

function makeKeyEvent(
    key: string,
    overrides: Partial<KeyboardEvent> = {}
): React.KeyboardEvent<HTMLElement> {
    return {
        key,
        shiftKey: false,
        metaKey: false,
        ctrlKey: false,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        nativeEvent: {
            key,
            shiftKey: false,
            metaKey: false,
            ctrlKey: false,
            preventDefault: vi.fn(),
            stopPropagation: vi.fn(),
            target: document.body,
            ...overrides,
        } as unknown as KeyboardEvent,
        ...overrides,
    } as unknown as React.KeyboardEvent<HTMLElement>;
}

describe("useTableSelection", () => {
    const rows = [makeRow("row-0"), makeRow("row-1"), makeRow("row-2"), makeRow("row-3")];
    const onRowSelectionChange = vi.fn();

    function setup(overrides: Partial<Parameters<typeof useTableSelection>[0]> = {}) {
        return renderHook(() =>
            useTableSelection({
                rows,
                rowSelection: {},
                onRowSelectionChange,
                enableSelection: true,
                useGlobal: false,
                ...overrides,
            } as Parameters<typeof useTableSelection>[0])
        );
    }

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("enableSelection", () => {
        it("does nothing on click when enableSelection is false", () => {
            const { result } = setup({ enableSelection: false });

            act(() => {
                result.current.handleRowClick(rows[0], {
                    stopPropagation: vi.fn(),
                    preventDefault: vi.fn(),
                } as unknown as React.MouseEvent);
            });

            expect(onRowSelectionChange).not.toHaveBeenCalled();
        });

        it("returns focusedRowIndex -1 when selection is disabled", () => {
            const { result } = setup({ enableSelection: false });
            expect(result.current.focusedRowIndex).toBe(-1);
        });
    });

    describe("mouse interactions", () => {
        it("selects a single row on click", () => {
            const { result } = setup();
            const stopPropagation = vi.fn();
            const preventDefault = vi.fn();

            act(() => {
                result.current.handleRowClick(rows[1], {
                    target: document.createElement("div"),
                    stopPropagation,
                    preventDefault,
                } as unknown as React.MouseEvent);
            });

            expect(onRowSelectionChange).toHaveBeenCalled();
            const callArg = onRowSelectionChange.mock.calls[0][0];
            expect(callArg).toEqual({ "row-1": true });
        });

        it("replaces existing selection on plain click", () => {
            const existingSelection = { "row-0": true, "row-2": true };
            const { result } = setup({ rowSelection: existingSelection });

            act(() => {
                result.current.handleRowClick(rows[1], {
                    target: document.createElement("div"),
                    stopPropagation: vi.fn(),
                    preventDefault: vi.fn(),
                } as unknown as React.MouseEvent);
            });

            expect(onRowSelectionChange).toHaveBeenCalled();
            // plain click should call onRowSelectionChange with { row-1: true },
            // replacing the old selection, not toggling
            const callArg = onRowSelectionChange.mock.calls[0][0];
            expect(callArg).toEqual({ "row-1": true });
        });

        it("toggles a row on ctrl+click", () => {
            const { result } = setup();

            act(() => {
                result.current.handleRowClick(rows[2], {
                    target: document.createElement("div"),
                    metaKey: true,
                    ctrlKey: false,
                    stopPropagation: vi.fn(),
                    preventDefault: vi.fn(),
                } as unknown as React.MouseEvent);
            });

            expect(onRowSelectionChange).toHaveBeenCalled();
            const updater = onRowSelectionChange.mock.calls[0][0];
            expect(typeof updater).toBe("function");
        });

        it("selects a range on shift+click with an anchor", () => {
            const { result } = setup();

            act(() => {
                result.current.handleRowClick(rows[0], {
                    target: document.createElement("div"),
                    stopPropagation: vi.fn(),
                    preventDefault: vi.fn(),
                } as unknown as React.MouseEvent);
            });

            act(() => {
                result.current.handleRowClick(rows[3], {
                    target: document.createElement("div"),
                    shiftKey: true,
                    stopPropagation: vi.fn(),
                    preventDefault: vi.fn(),
                } as unknown as React.MouseEvent);
            });

            expect(onRowSelectionChange).toHaveBeenCalledTimes(2);
        });

        it("stops propagation on row click", () => {
            const { result } = setup();
            const stopPropagation = vi.fn();
            const preventDefault = vi.fn();

            act(() => {
                result.current.handleRowClick(rows[0], {
                    target: document.createElement("div"),
                    stopPropagation,
                    preventDefault,
                } as unknown as React.MouseEvent);
            });

            expect(stopPropagation).toHaveBeenCalled();
            expect(preventDefault).toHaveBeenCalled();
        });

        it("ignores clicks on native buttons, links, inputs and labels", () => {
            const { result } = setup();
            const stopPropagation = vi.fn();

            const buttonEl = document.createElement("button");
            const div = document.createElement("div");
            div.appendChild(buttonEl);

            act(() => {
                result.current.handleRowClick(rows[0], {
                    target: buttonEl,
                    stopPropagation,
                    preventDefault: vi.fn(),
                } as unknown as React.MouseEvent);
            });

            expect(stopPropagation).not.toHaveBeenCalled();
        });

        it("prevents default on mousedown with shift key", () => {
            const { result } = setup();
            const preventDefault = vi.fn();

            act(() => {
                result.current.handleRowMouseDown({
                    shiftKey: true,
                    preventDefault,
                } as unknown as React.MouseEvent);
            });

            expect(preventDefault).toHaveBeenCalled();
        });
    });

    describe("keyboard navigation", () => {
        it("moves focus down with ArrowDown", () => {
            const { result } = setup();

            act(() => {
                result.current.focusRowAt(0);
            });

            act(() => {
                result.current.handleKeyDown(makeKeyEvent("ArrowDown"));
            });

            expect(result.current.focusedRowIndex).toBe(1);
        });

        it("moves focus up with ArrowUp", () => {
            const { result } = setup();

            act(() => {
                result.current.focusRowAt(2);
            });

            act(() => {
                result.current.handleKeyDown(makeKeyEvent("ArrowUp"));
            });

            expect(result.current.focusedRowIndex).toBe(1);
        });

        it("does not move above row 0", () => {
            const { result } = setup();

            act(() => {
                result.current.focusRowAt(0);
            });

            act(() => {
                result.current.handleKeyDown(makeKeyEvent("ArrowUp"));
            });

            expect(result.current.focusedRowIndex).toBe(0);
        });

        it("does not move below the last row", () => {
            const { result } = setup();

            act(() => {
                result.current.focusRowAt(3);
            });

            act(() => {
                result.current.handleKeyDown(makeKeyEvent("ArrowDown"));
            });

            expect(result.current.focusedRowIndex).toBe(3);
        });

        it("starts from row 0 on ArrowDown when no row is focused", () => {
            const { result } = setup();

            act(() => {
                result.current.handleKeyDown(makeKeyEvent("ArrowDown"));
            });

            expect(result.current.focusedRowIndex).toBe(0);
        });

        it("vim j moves focus down", () => {
            const { result } = setup();

            act(() => {
                result.current.focusRowAt(0);
            });

            act(() => {
                result.current.handleKeyDown(makeKeyEvent("j"));
            });

            expect(result.current.focusedRowIndex).toBe(1);
        });

        it("vim k moves focus up", () => {
            const { result } = setup();

            act(() => {
                result.current.focusRowAt(2);
            });

            act(() => {
                result.current.handleKeyDown(makeKeyEvent("k"));
            });

            expect(result.current.focusedRowIndex).toBe(1);
        });

        it("double g jumps to the first row", () => {
            const { result } = setup();

            act(() => {
                result.current.focusRowAt(3);
            });

            act(() => {
                result.current.handleKeyDown(makeKeyEvent("g"));
            });

            act(() => {
                result.current.handleKeyDown(makeKeyEvent("g"));
            });

            expect(result.current.focusedRowIndex).toBe(0);
        });

        it("G jumps to the last row", () => {
            const { result } = setup();

            act(() => {
                result.current.focusRowAt(0);
            });

            act(() => {
                result.current.handleKeyDown(makeKeyEvent("G"));
            });

            expect(result.current.focusedRowIndex).toBe(3);
        });

        it("calls onJumpToEnd for G when provided", async () => {
            const onJumpToEnd = vi.fn().mockResolvedValue(undefined);

            const { result } = renderHook(() =>
                useTableSelection({
                    rows,
                    rowSelection: {},
                    onRowSelectionChange,
                    enableSelection: true,
                    onJumpToEnd,
                    useGlobal: false,
                })
            );

            act(() => {
                result.current.handleKeyDown(makeKeyEvent("G"));
            });

            await act(async () => {
                await vi.waitFor(() => {
                    expect(onJumpToEnd).toHaveBeenCalled();
                });
            });
        });
    });

    describe("keyboard selection actions", () => {
        it("clears selection on Escape", () => {
            const { result } = setup();

            act(() => {
                result.current.handleKeyDown(makeKeyEvent("Escape"));
            });

            expect(onRowSelectionChange).toHaveBeenCalledWith({});
            expect(result.current.focusedRowIndex).toBe(-1);
        });

        it("selects all rows on Ctrl+A", () => {
            const { result } = setup();

            act(() => {
                result.current.handleKeyDown(makeKeyEvent("a", { metaKey: true }));
            });

            expect(onRowSelectionChange).toHaveBeenCalledWith({
                "row-0": true,
                "row-1": true,
                "row-2": true,
                "row-3": true,
            });
            expect(result.current.focusedRowIndex).toBe(0);
        });
    });

    describe("focus utilities", () => {
        it("getRowTabIndex returns 0 for focused row, -1 otherwise", () => {
            const { result } = setup();

            act(() => {
                result.current.focusRowAt(1);
            });

            expect(result.current.getRowTabIndex(1)).toBe(0);
            expect(result.current.getRowTabIndex(2)).toBe(-1);
        });

        it("isRowFocused returns true only for focused row", () => {
            const { result } = setup();

            act(() => {
                result.current.focusRowAt(2);
            });

            expect(result.current.isRowFocused(2)).toBe(true);
            expect(result.current.isRowFocused(0)).toBe(false);
        });

        it("focusRowAt sets the focused index", () => {
            const { result } = setup();

            act(() => {
                result.current.focusRowAt(3);
            });

            expect(result.current.focusedRowIndex).toBe(3);
        });

        it("rowRefCallback registers and unregisters refs", () => {
            const { result } = setup();

            act(() => {
                const cb = result.current.rowRefCallback(0);
                const tr = document.createElement("tr");
                cb(tr);
            });

            expect(result.current.focusedRowIndex).toBe(-1);

            act(() => {
                const cb = result.current.rowRefCallback(0);
                cb(null);
            });
        });
    });
});
