import type { ImportRow, ImportMapping } from "@/types/models/import.types";

const FIELD_PRIORITY = [
    "title_nl",
    "title_en",
    "title",
    "name",
    "slug",
    "source_id",
    "id",
    "production_id",
    "start_time",
    "starts_at",
];

function present(value: unknown): string | null {
    if (value === null || value === undefined) {
        return null;
    }
    if (typeof value !== "string" && typeof value !== "number") {
        return null;
    }
    const str = String(value).trim();
    if (str === "") {
        return null;
    }
    return str.length > 40 ? str.slice(0, 40) + "…" : str;
}

/**
 * Returns a short human-readable label for a dry-run or history row.
 * Prefer stable identifying fields over arbitrary mapping order, because
 * generic CSVs can map long descriptions before titles.
 */
export function resolveRowLabel(row: ImportRow, mapping: ImportMapping): string {
    for (const fieldName of FIELD_PRIORITY) {
        const mappedHeader = Object.entries(mapping.columns).find(
            ([, mappedField]) => mappedField === fieldName
        )?.[0];
        if (!mappedHeader) {
            continue;
        }
        const label = present(row.rawData[mappedHeader]);
        if (label) {
            return label;
        }
    }

    for (const [csvHeader, fieldName] of Object.entries(mapping.columns)) {
        if (fieldName === null) {
            continue;
        }
        const label = present(row.rawData[csvHeader]);
        if (label) {
            return label;
        }
    }
    if (row.targetEntityId !== null) {
        return row.targetEntityId.slice(0, 8) + "…";
    }
    return "—";
}
