import type { FieldSpec } from "@/types/models/import.types";

function normalise(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function levenshtein(a: string, b: string): number {
    const m = a.length;
    const n = b.length;

    if (m === 0) {
        return n;
    }
    if (n === 0) {
        return m;
    }

    const prev: number[] = Array.from({ length: n + 1 }, (_, i) => i);
    const curr: number[] = new Array<number>(n + 1);

    for (let i = 1; i <= m; i++) {
        curr[0] = i;
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            curr[j] = Math.min(
                (curr[j - 1] ?? 0) + 1,
                (prev[j] ?? 0) + 1,
                (prev[j - 1] ?? 0) + cost
            );
        }
        prev.splice(0, prev.length, ...curr);
    }

    return prev[n] ?? 0;
}

function similarity(a: string, b: string): number {
    const normA = normalise(a);
    const normB = normalise(b);
    const maxLen = Math.max(normA.length, normB.length);
    if (maxLen === 0) {
        return 1;
    }
    const dist = levenshtein(normA, normB);
    return 1 - dist / maxLen;
}

const SIMILARITY_THRESHOLD = 0.65;

export function autoSuggestMapping(
    headers: string[],
    fields: FieldSpec[]
): Record<string, string | null> {
    const result: Record<string, string | null> = {};

    for (const header of headers) {
        let bestScore = -1;
        let bestFieldName: string | null = null;

        for (const field of fields) {
            const scoreByName = similarity(header, field.name);
            const scoreByLabel = similarity(header, field.label);
            const score = Math.max(scoreByName, scoreByLabel);

            if (score > bestScore) {
                bestScore = score;
                bestFieldName = field.name;
            }
        }

        result[header] = bestScore >= SIMILARITY_THRESHOLD ? bestFieldName : null;
    }

    return result;
}
