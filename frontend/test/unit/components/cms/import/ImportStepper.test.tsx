import { describe, expect, it, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../../../src/messages/en.json";
import { ImportStepper } from "@/components/cms/import/ImportStepper";

function renderStepper(currentStage: "upload" | "mapping" | "dry_run" | "commit") {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <ImportStepper currentStage={currentStage} />
        </NextIntlClientProvider>
    );
}

describe("ImportStepper", () => {
    afterEach(() => {
        cleanup();
    });

    it("shows Upload as active and no completed steps when currentStage is upload", () => {
        renderStepper("upload");

        expect(screen.getByText("Upload")).toBeInTheDocument();
        expect(screen.queryAllByLabelText("completed")).toHaveLength(0);
    });

    it("shows Dry-run as active and two completed steps when currentStage is dry_run", () => {
        renderStepper("dry_run");

        expect(screen.getByText("Dry-run")).toBeInTheDocument();
        expect(screen.getAllByLabelText("completed")).toHaveLength(2);
    });

    it("shows Commit as active and three completed steps when currentStage is commit", () => {
        renderStepper("commit");

        expect(screen.getByText("Commit")).toBeInTheDocument();
        expect(screen.getAllByLabelText("completed")).toHaveLength(3);
    });
});
