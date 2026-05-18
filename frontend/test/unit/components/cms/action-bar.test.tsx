import { describe, expect, it, afterEach, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

import { ActionBar } from "@/app/[locale]/(cms)/cms/tables/action-bar";
import { ActionVariant, type BulkAction } from "@/types/cms/actions";

const messages = {
    Cms: {
        ActionBar: {
            clearSelection: "Deselecteer",
            productions: "{count} producties",
            locations: "{count} locaties",
        },
    },
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <NextIntlClientProvider locale="nl" messages={messages}>
        {children}
    </NextIntlClientProvider>
);

const onClear = vi.fn();
const onClickAction = vi.fn();

const sampleActions: BulkAction[] = [
    {
        key: "delete",
        label: "Verwijder",
        variant: ActionVariant.Destructive,
        onClick: onClickAction,
    },
    { key: "export", label: "Exporteer", onClick: onClickAction, disabled: true },
    { key: "tag", label: "Taggen", icon: <span data-testid="tag-icon" />, onClick: onClickAction },
];

describe("ActionBar", () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it("renders nothing when no entities are selected (all counts 0)", () => {
        const { container } = render(
            <ActionBar
                entityCounts={[
                    { countKey: "productions", count: 0 },
                    { countKey: "locations", count: 0 },
                ]}
                actions={sampleActions}
                onClear={onClear}
            />,
            { wrapper: TestWrapper }
        );

        expect(container.querySelector("span")).toBeNull();
        expect(screen.queryByText("Verwijder")).toBeNull();
    });

    it("renders nothing when entityCounts array is empty", () => {
        const { container } = render(
            <ActionBar entityCounts={[]} actions={sampleActions} onClear={onClear} />,
            { wrapper: TestWrapper }
        );

        expect(container.querySelector("span")).toBeNull();
    });

    it("renders entity counts with translated labels", () => {
        render(
            <ActionBar
                entityCounts={[
                    { countKey: "productions", count: 3 },
                    { countKey: "locations", count: 1 },
                ]}
                actions={[]}
                onClear={onClear}
            />,
            { wrapper: TestWrapper }
        );

        expect(screen.getByText("3 producties")).toBeInTheDocument();
        expect(screen.getByText("1 locaties")).toBeInTheDocument();
    });

    it("renders only counts that are greater than 0", () => {
        render(
            <ActionBar
                entityCounts={[
                    { countKey: "productions", count: 2 },
                    { countKey: "locations", count: 0 },
                ]}
                actions={[]}
                onClear={onClear}
            />,
            { wrapper: TestWrapper }
        );

        expect(screen.getByText("2 producties")).toBeInTheDocument();
        expect(screen.queryByText(/locaties/)).toBeNull();
    });

    it("renders action buttons with correct variants", () => {
        render(
            <ActionBar
                entityCounts={[{ countKey: "productions", count: 1 }]}
                actions={sampleActions}
                onClear={onClear}
            />,
            { wrapper: TestWrapper }
        );

        expect(screen.getByText("Verwijder")).toBeInTheDocument();
        expect(screen.getByText("Exporteer")).toBeInTheDocument();
        expect(screen.getByText("Taggen")).toBeInTheDocument();
    });

    it("disables actions with disabled=true or no onClick", () => {
        render(
            <ActionBar
                entityCounts={[{ countKey: "productions", count: 1 }]}
                actions={[
                    { key: "export", label: "Exporteer", onClick: onClickAction, disabled: true },
                    { key: "info", label: "Info" },
                ]}
                onClear={onClear}
            />,
            { wrapper: TestWrapper }
        );

        expect(screen.getByText("Exporteer").closest("button")).toBeDisabled();
        expect(screen.getByText("Info").closest("button")).toBeDisabled();
    });

    it("calls action.onClick when button is clicked", () => {
        render(
            <ActionBar
                entityCounts={[{ countKey: "productions", count: 1 }]}
                actions={sampleActions}
                onClear={onClear}
            />,
            { wrapper: TestWrapper }
        );

        screen.getByText("Verwijder").click();
        expect(onClickAction).toHaveBeenCalledTimes(1);
    });

    it("renders clear button with icon and translated label", () => {
        render(
            <ActionBar
                entityCounts={[{ countKey: "productions", count: 1 }]}
                actions={[]}
                onClear={onClear}
            />,
            { wrapper: TestWrapper }
        );

        expect(screen.getByText("Deselecteer")).toBeInTheDocument();
    });

    it("calls onClear when clear button is clicked", () => {
        render(
            <ActionBar
                entityCounts={[{ countKey: "productions", count: 1 }]}
                actions={[]}
                onClear={onClear}
            />,
            { wrapper: TestWrapper }
        );

        screen.getByText("Deselecteer").click();
        expect(onClear).toHaveBeenCalledTimes(1);
    });

    it("renders search slot when provided", () => {
        render(
            <ActionBar
                entityCounts={[]}
                actions={[]}
                onClear={onClear}
                search={<input data-testid="search-input" placeholder="Search..." />}
            />,
            { wrapper: TestWrapper }
        );

        expect(screen.getByTestId("search-input")).toBeInTheDocument();
    });

    it("renders both search and selection bar when both are provided", () => {
        render(
            <ActionBar
                entityCounts={[{ countKey: "productions", count: 2 }]}
                actions={sampleActions}
                onClear={onClear}
                search={<input data-testid="search-input" />}
            />,
            { wrapper: TestWrapper }
        );

        expect(screen.getByTestId("search-input")).toBeInTheDocument();
        expect(screen.getByText("2 producties")).toBeInTheDocument();
        expect(screen.getByText("Verwijder")).toBeInTheDocument();
    });

    it("renders action icon when provided", () => {
        render(
            <ActionBar
                entityCounts={[{ countKey: "productions", count: 1 }]}
                actions={sampleActions}
                onClear={onClear}
            />,
            { wrapper: TestWrapper }
        );

        expect(screen.getByTestId("tag-icon")).toBeInTheDocument();
    });

    it("applies custom className", () => {
        const { container } = render(
            <ActionBar
                entityCounts={[{ countKey: "productions", count: 1 }]}
                actions={[]}
                onClear={onClear}
                className="my-custom-class"
            />,
            { wrapper: TestWrapper }
        );

        expect(container.firstChild).toHaveClass("my-custom-class");
    });
});
