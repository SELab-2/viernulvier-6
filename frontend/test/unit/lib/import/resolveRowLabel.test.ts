import { describe, it, expect } from "vitest";
import { resolveRowLabel } from "@/lib/import/resolveRowLabel";
import type { ImportRow, ImportMapping } from "@/types/models/import.types";

function makeRow(
    rawData: Record<string, unknown>,
    targetEntityId: string | null = null
): ImportRow {
    return {
        id: "r1",
        sessionId: "s1",
        rowNumber: 1,
        status: "will_create",
        rawData,
        overrides: {},
        resolvedRefs: {},
        diff: null,
        warnings: [],
        targetEntityId,
    };
}

const mapping: ImportMapping = {
    columns: { title: "title", slug: "slug", season: null },
};

describe("resolveRowLabel", () => {
    it("returns the first non-empty mapped CSV value", () => {
        const row = makeRow({ title: "Hamlet", slug: "hamlet-2023", season: "2023" });
        expect(resolveRowLabel(row, mapping)).toBe("Hamlet");
    });

    it("skips unmapped (null) columns", () => {
        const row = makeRow({ title: "", slug: "hamlet-slug", season: "2023" });
        expect(resolveRowLabel(row, mapping)).toBe("hamlet-slug");
    });

    it("truncates long values with ellipsis", () => {
        const longTitle = "A".repeat(50);
        const row = makeRow({ title: longTitle, slug: "x" });
        const label = resolveRowLabel(row, mapping);
        expect(label).toHaveLength(41); // 40 chars + "…"
        expect(label.endsWith("…")).toBe(true);
    });

    it("falls back to short targetEntityId when no rawData matches", () => {
        const row = makeRow({ title: "", slug: "" }, "abc12345-0000-0000-0000-000000000000");
        expect(resolveRowLabel(row, mapping)).toBe("abc12345…");
    });

    it("returns em dash when no data and no targetEntityId", () => {
        const row = makeRow({ title: "", slug: "" });
        expect(resolveRowLabel(row, mapping)).toBe("—");
    });

    it("does not truncate a value of exactly 40 characters", () => {
        const row = makeRow({ title: "A".repeat(40), slug: "x" });
        const label = resolveRowLabel(row, mapping);
        expect(label).toHaveLength(40);
        expect(label.endsWith("…")).toBe(false);
    });

    it("truncates a value of exactly 41 characters", () => {
        const row = makeRow({ title: "A".repeat(41), slug: "x" });
        const label = resolveRowLabel(row, mapping);
        expect(label).toHaveLength(41);
        expect(label.endsWith("…")).toBe(true);
    });

    it("skips object values in rawData and falls back", () => {
        const row = makeRow({ title: { nested: true }, slug: "fallback" });
        expect(resolveRowLabel(row, mapping)).toBe("fallback");
    });
});
