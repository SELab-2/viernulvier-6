import type { ImportRow, ImportMapping } from "@/types/models/import.types";

/**
 * Returns a short human-readable label for a dry-run or history row.
 * Iterates mapping.columns in insertion order — callers rely on the backend
 * preserving a meaningful column ordering (title/name columns first).
 */
export function resolveRowLabel(row: ImportRow, mapping: ImportMapping): string {
    for (const [csvHeader, fieldName] of Object.entries(mapping.columns)) {
        if (fieldName === null) {
            continue;
        }
        const value = row.rawData[csvHeader];
        if (
            value !== null &&
            value !== undefined &&
            (typeof value === "string" || typeof value === "number")
        ) {
            const str = String(value).trim();
            if (str !== "") {
                return str.length > 40 ? str.slice(0, 40) + "…" : str;
            }
        }
    }
    if (row.targetEntityId !== null) {
        return row.targetEntityId.slice(0, 8) + "…";
    }
    return "—";
}
