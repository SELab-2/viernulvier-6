"use client";

import { useTranslations } from "next-intl";

import type { FieldSpec } from "@/types/models/import.types";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const IGNORE_SENTINEL = "__ignore__";

type ColumnMapRowProps = {
    header: string;
    sampleValues: string[];
    fields: FieldSpec[];
    currentMapping: string | null;
    onChange: (fieldName: string | null) => void;
};

export function ColumnMapRow({
    header,
    sampleValues,
    fields,
    currentMapping,
    onChange,
}: ColumnMapRowProps) {
    const t = useTranslations("Cms.Import");

    const selectValue = currentMapping ?? IGNORE_SENTINEL;

    function handleValueChange(value: string) {
        onChange(value === IGNORE_SENTINEL ? null : value);
    }

    const displayedSamples = sampleValues.slice(0, 3);

    return (
        <tr>
            <td className="w-1/2 py-2 pr-4 align-top">
                <p className="text-sm font-medium">{header}</p>
                {displayedSamples.length > 0 && (
                    <p className="text-muted-foreground mt-0.5 text-xs">
                        <span className="sr-only">{t("mapping.sampleValuesLabel")}: </span>
                        {displayedSamples.map((v, i) => (
                            <span key={i}>
                                {i > 0 && <span className="mx-1 opacity-40">·</span>}
                                <span className="inline-block max-w-[120px] truncate align-bottom">
                                    {v}
                                </span>
                            </span>
                        ))}
                    </p>
                )}
            </td>
            <td className="w-1/2 py-2 align-top">
                <Select value={selectValue} onValueChange={handleValueChange}>
                    <SelectTrigger className="w-full">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={IGNORE_SENTINEL}>{t("mapping.ignoreOption")}</SelectItem>
                        {fields.map((field) => (
                            <SelectItem key={field.name} value={field.name}>
                                {field.label}
                                {field.required && " *"}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </td>
        </tr>
    );
}
