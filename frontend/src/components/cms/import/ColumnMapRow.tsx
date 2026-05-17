"use client";

import { useTranslations } from "next-intl";

import type { FieldSpec, FieldType } from "@/types/models/import.types";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const IGNORE_SENTINEL = "__ignore__";

function fieldTypeKey(kind: FieldType["kind"]): string {
    return `mapping.fieldType.${kind}`;
}

type ColumnMapRowProps = {
    header: string;
    sampleValues: string[];
    fields: FieldSpec[];
    currentMapping: string | null;
    selectedField: FieldSpec | null;
    mismatchCount: number;
    mismatchExamples: string[];
    onChange: (fieldName: string | null) => void;
};

export function ColumnMapRow({
    header,
    sampleValues,
    fields,
    currentMapping,
    selectedField,
    mismatchCount,
    mismatchExamples,
    onChange,
}: ColumnMapRowProps) {
    const t = useTranslations("Cms.Import");

    const selectValue = currentMapping ?? IGNORE_SENTINEL;
    const visibleSamples = sampleValues.slice(0, 3).filter(Boolean);

    function handleValueChange(value: string) {
        onChange(value === IGNORE_SENTINEL ? null : value);
    }

    return (
        <tr className="border-border border-b last:border-b-0">
            <td className="w-1/2 px-5 py-4 align-top">
                <p
                    className={cn(
                        "text-sm font-medium",
                        currentMapping === null && "text-muted-foreground"
                    )}
                >
                    {header}
                </p>
                {visibleSamples.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="sr-only">{t("mapping.sampleValuesLabel")}</span>
                        {visibleSamples.map((v, i) => (
                            <span
                                key={`${i}-${v}`}
                                title={v}
                                className="bg-muted text-foreground max-w-[120px] truncate px-1.5 py-0.5 font-mono text-[10px]"
                            >
                                {v}
                            </span>
                        ))}
                    </div>
                )}
            </td>
            <td className="w-1/2 px-5 py-4 align-top">
                <Select value={selectValue} onValueChange={handleValueChange}>
                    <SelectTrigger className="w-full rounded-none font-mono text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={IGNORE_SENTINEL}>{t("mapping.ignoreOption")}</SelectItem>
                        {fields.map((field) => (
                            <SelectItem key={field.name} value={field.name}>
                                <span className="flex items-baseline gap-1.5">
                                    <span>
                                        {field.label}
                                        {field.required && " *"}
                                    </span>
                                    <span className="text-muted-foreground text-[10px]">
                                        · {t(fieldTypeKey(field.fieldType.kind))}
                                    </span>
                                </span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {selectedField && (
                    <div className="mt-2 space-y-1">
                        <p className="text-muted-foreground font-mono text-[10px] tracking-wide uppercase">
                            {t("mapping.expectedType", {
                                type: t(fieldTypeKey(selectedField.fieldType.kind)),
                            })}
                        </p>
                        {mismatchCount > 0 && (
                            <p className="text-destructive text-xs leading-relaxed">
                                {t("mapping.typeMismatch", {
                                    count: mismatchCount,
                                    examples: mismatchExamples.join(", "),
                                })}
                            </p>
                        )}
                    </div>
                )}
            </td>
        </tr>
    );
}
