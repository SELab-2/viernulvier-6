"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import type { FieldSpec, ImportRow } from "@/types/models/import.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FkPickerProps = {
    row: ImportRow;
    fkFields: FieldSpec[];
    onChangeRef: (field: string, value: string | null) => void;
};

export function FkPicker({ row, fkFields, onChangeRef }: FkPickerProps) {
    const t = useTranslations("Cms.Import");

    if (fkFields.length === 0) {
        return null;
    }

    return (
        <div className="space-y-2">
            <p className="text-sm font-medium">{t("drawer.fkPicker")}</p>
            <div className="space-y-3">
                {fkFields.map((field) => (
                    <FkPickerRow
                        key={field.name}
                        field={field}
                        resolvedValue={
                            (row.resolvedRefs[field.name] as string | null | undefined) ?? null
                        }
                        onChangeRef={onChangeRef}
                    />
                ))}
            </div>
        </div>
    );
}

type FkPickerRowProps = {
    field: FieldSpec;
    resolvedValue: string | null;
    onChangeRef: (field: string, value: string | null) => void;
};

function FkPickerRow({ field, resolvedValue, onChangeRef }: FkPickerRowProps) {
    const t = useTranslations("Cms.Import");
    const [inputValue, setInputValue] = useState(resolvedValue ?? "");

    const handleBlur = () => {
        onChangeRef(field.name, inputValue.trim() || null);
    };

    const handleClear = () => {
        setInputValue("");
        onChangeRef(field.name, null);
    };

    const fieldInputId = `fk-${field.name}`;

    return (
        <div className="space-y-1">
            <label htmlFor={fieldInputId} className="text-sm font-medium">
                {field.label}
            </label>
            <div className="flex gap-2">
                {/* TODO: typeahead search once backend endpoint exists */}
                <Input
                    id={fieldInputId}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onBlur={handleBlur}
                    placeholder="UUID…"
                    className="h-8 font-mono text-xs"
                />
                <Button variant="outline" size="sm" type="button" onClick={handleClear}>
                    {t("drawer.fkClear")}
                </Button>
            </div>
        </div>
    );
}
