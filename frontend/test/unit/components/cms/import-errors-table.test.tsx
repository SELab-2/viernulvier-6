import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";

import { ImportErrorsTable } from "@/app/[locale]/(cms)/cms/tables/import-errors/import-errors-table";
import messages from "@/messages/en.json";
import { createTestQueryClient } from "../../../utils/query-client";

const renderImportErrorsTable = () => {
    const queryClient = createTestQueryClient();

    render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <QueryClientProvider client={queryClient}>
                <ImportErrorsTable />
            </QueryClientProvider>
        </NextIntlClientProvider>
    );

    return { queryClient };
};

afterEach(() => {
    cleanup();
});

describe("ImportErrorsTable", () => {
    it("renders unresolved import errors with relation fallback", async () => {
        renderImportErrorsTable();

        expect(screen.getByRole("heading", { name: "Import errors" })).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText("media")).toBeInTheDocument();
        });

        expect(screen.getByText("error")).toBeInTheDocument();
        expect(screen.getByText("404")).toBeInTheDocument();
        expect(screen.getByText("missing_required_field")).toBeInTheDocument();
        expect(
            screen.getByText("media is missing required field download_url")
        ).toBeInTheDocument();
        expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("navigates to the next cursor page and back", async () => {
        renderImportErrorsTable();

        await waitFor(() => {
            expect(
                screen.getByText("media is missing required field download_url")
            ).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole("button", { name: "Next page" }));

        await waitFor(() => {
            expect(screen.getByText("media_variant")).toBeInTheDocument();
        });

        expect(screen.getByText("warning")).toBeInTheDocument();
        expect(screen.getByText("media (404)")).toBeInTheDocument();
        expect(screen.getByText("failed to download crop")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();

        fireEvent.click(screen.getByRole("button", { name: "Previous page" }));

        await waitFor(() => {
            expect(
                screen.getByText("media is missing required field download_url")
            ).toBeInTheDocument();
        });
    });

    it("resets pagination when switching to resolved errors", async () => {
        const user = userEvent.setup();
        renderImportErrorsTable();

        await waitFor(() => {
            expect(
                screen.getByText("media is missing required field download_url")
            ).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole("button", { name: "Next page" }));

        await waitFor(() => {
            expect(screen.getByText("media_variant")).toBeInTheDocument();
        });

        await user.click(screen.getByRole("tab", { name: "Resolved" }));

        await waitFor(() => {
            expect(screen.getByText("event")).toBeInTheDocument();
        });

        expect(screen.getByText("missing_optional_relation")).toBeInTheDocument();
        expect(screen.getByText("hall (99)")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    });
});
