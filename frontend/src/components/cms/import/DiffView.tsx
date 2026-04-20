"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

import type { ImportRow } from "@/types/models/import.types";
import { Input } from "@/components/ui/input";

type DiffEntry = { current: unknown; incoming: unknown };
type RowDiff = Record<string, DiffEntry>;

const DEBOUNCE_MS = 400;

function parseIncoming(raw: string, current: unknown): unknown {
    if (typeof current === "number") {
        const n = Number(raw);
        return Number.isNaN(n) ? raw : n;
    }
    return raw;
}

function formatValue(value: unknown): string {
    if (value === null || value === undefined) {
        return "—";
    }
    if (typeof value === "object") {
        return JSON.stringify(value);
    }
    return String(value);
}

type DiffViewProps = {
    row: ImportRow;
    onChangeField: (field: string, value: unknown) => void;
};

export function DiffView({ row, onChangeField }: DiffViewProps) {
    const t = useTranslations("Cms.Import");
    const diff = row.diff as RowDiff | null;

    if (!diff || Object.keys(diff).length === 0) {
        return <p className="text-muted-foreground text-sm">{t("drawer.noDiff")}</p>;
    }

    return (
        <div className="space-y-2">
            <p className="text-sm font-medium">{t("drawer.diff")}</p>
            <div className="space-y-3">
                {Object.entries(diff).map(([field, entry]) => (
                    <DiffRow
                        key={field}
                        field={field}
                        entry={entry}
                        onChangeField={onChangeField}
                    />
                ))}
            </div>
        </div>
    );
}

type DiffRowProps = {
    field: string;
    entry: DiffEntry;
    onChangeField: (field: string, value: unknown) => void;
};

function DiffRow({ field, entry, onChangeField }: DiffRowProps) {
    const t = useTranslations("Cms.Import");
    const [inputValue, setInputValue] = useState(formatValue(entry.incoming));
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleBlur = () => {
        if (debounceRef.current !== null) {
            clearTimeout(debounceRef.current);
        }
        debounceRef.current = setTimeout(() => {
            onChangeField(field, parseIncoming(inputValue, entry.current));
        }, DEBOUNCE_MS);
    };

    return (
        <div className="grid grid-cols-[1fr_1fr] gap-3 rounded-md border p-3">
            <div>
                <p className="text-muted-foreground mb-1 text-xs">{t("drawer.currentValue")}</p>
                <p className="text-sm font-medium break-all">{field}</p>
                <p className="text-muted-foreground text-sm">{formatValue(entry.current)}</p>
            </div>
            <div>
                <p className="text-muted-foreground mb-1 text-xs">{t("drawer.incomingValue")}</p>
                <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onBlur={handleBlur}
                    className="h-8 text-sm"
                />
            </div>
        </div>
    );
}
