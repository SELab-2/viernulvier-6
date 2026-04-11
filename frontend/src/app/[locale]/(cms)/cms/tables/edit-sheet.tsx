"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";

export interface SelectOption {
    value: string;
    label: string;
}

export type FieldType = "text" | "boolean" | "select";

export interface FieldDef<TData> {
    key: keyof TData;
    label: string;
    type: FieldType;
    options?: SelectOption[];
    readOnly?: boolean;
}

export interface EditSheetProps<TData extends { id: string } & Record<string, unknown>> {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entity: TData | null;
    fields: FieldDef<TData>[];
    title: string;
    description?: string;
    onSave?: (data: TData) => void;
}

const NULL_SENTINEL = "__null__";

interface FieldRowProps<TData> {
    field: FieldDef<TData>;
    value: unknown;
    onChange: (value: unknown) => void;
}

function FieldRow<TData>({ field, value, onChange }: FieldRowProps<TData>) {
    const t = useTranslations("Cms.EditSheet");
    const fieldId = `field-${String(field.key)}`;
    const stringValue = value === null || value === undefined ? "" : String(value);

    if (field.readOnly) {
        return (
            <div className="flex flex-col gap-1.5">
                <span className="text-muted-foreground font-mono text-[9px] tracking-[1.2px] uppercase">
                    {field.label}
                </span>
                <div className="border-foreground/10 bg-foreground/[0.02] rounded-sm border px-3 py-2">
                    <code className="text-muted-foreground font-mono text-xs">
                        {stringValue || "—"}
                    </code>
                </div>
            </div>
        );
    }

    if (field.type === "text") {
        return (
            <div className="flex flex-col gap-1.5">
                <Label
                    htmlFor={fieldId}
                    className="text-muted-foreground font-mono text-[9px] tracking-[1.2px] uppercase"
                >
                    {field.label}
                </Label>
                <Input
                    id={fieldId}
                    value={stringValue}
                    onChange={(e) => onChange(e.target.value)}
                    className="border-foreground/20 focus-visible:ring-foreground/30 h-9 text-sm"
                />
            </div>
        );
    }

    if (field.type === "boolean") {
        const selectValue = value === null || value === undefined ? NULL_SENTINEL : String(value);
        const booleanOptions: SelectOption[] = [
            { value: "true", label: t("yes") },
            { value: "false", label: t("no") },
        ];

        return (
            <div className="flex flex-col gap-1.5">
                <Label
                    htmlFor={fieldId}
                    className="text-muted-foreground font-mono text-[9px] tracking-[1.2px] uppercase"
                >
                    {field.label}
                </Label>
                <Select
                    value={selectValue}
                    onValueChange={(v) => {
                        if (v === NULL_SENTINEL) {
                            onChange(null);
                        } else {
                            onChange(v === "true");
                        }
                    }}
                >
                    <SelectTrigger
                        id={fieldId}
                        className="border-foreground/20 focus:ring-foreground/30 h-9 w-full text-sm"
                    >
                        <SelectValue placeholder={t("selectPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent className="border-foreground/20">
                        <SelectItem value={NULL_SENTINEL}>—</SelectItem>
                        {booleanOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        );
    }

    const options = field.options ?? [];

    return (
        <div className="flex flex-col gap-1.5">
            <Label
                htmlFor={fieldId}
                className="text-muted-foreground font-mono text-[9px] tracking-[1.2px] uppercase"
            >
                {field.label}
            </Label>
            <Select value={stringValue} onValueChange={onChange}>
                <SelectTrigger
                    id={fieldId}
                    className="border-foreground/20 focus:ring-foreground/30 h-9 w-full text-sm"
                >
                    <SelectValue placeholder={t("selectPlaceholder")} />
                </SelectTrigger>
                <SelectContent className="border-foreground/20">
                    {options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

interface SheetFormBodyProps<TData extends { id: string } & Record<string, unknown>> {
    entity: TData;
    fields: FieldDef<TData>[];
    onSave?: (data: TData) => void;
    onClose: () => void;
}

function SheetFormBody<TData extends { id: string } & Record<string, unknown>>({
    entity,
    fields,
    onSave,
    onClose,
}: SheetFormBodyProps<TData>) {
    const t = useTranslations("Cms.EditSheet");
    const [values, setValues] = useState<Partial<TData>>(() => ({ ...entity }));

    const handleChange = (key: keyof TData, value: unknown) => {
        setValues((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        onSave?.({ ...entity, ...values } as TData);
        onClose();
    };

    return (
        <>
            <div className="flex flex-col gap-5 overflow-y-auto px-6 py-6">
                {fields.map((field) => (
                    <FieldRow
                        key={String(field.key)}
                        field={field}
                        value={values[field.key as keyof typeof values]}
                        onChange={(v) => handleChange(field.key, v)}
                    />
                ))}
            </div>
            <div className="border-foreground/10 border-t px-6 py-4">
                <SheetFooter className="flex-row justify-end gap-3 sm:justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="border-foreground/20 hover:bg-foreground/5 px-4 py-2 font-mono text-[10px] tracking-[1px] uppercase transition-colors"
                    >
                        {t("cancel")}
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="bg-foreground text-background hover:bg-foreground/90 px-4 py-2 font-mono text-[10px] tracking-[1px] uppercase transition-colors"
                    >
                        {t("saveChanges")}
                    </button>
                </SheetFooter>
            </div>
        </>
    );
}

export function EditSheet<TData extends { id: string } & Record<string, unknown>>({
    open,
    onOpenChange,
    entity,
    fields,
    title,
    description,
    onSave,
}: EditSheetProps<TData>) {
    const t = useTranslations("Cms.EditSheet");
    const formKey = entity?.id ?? null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="border-foreground/20 flex flex-col gap-0 border-l p-0 sm:max-w-md">
                <SheetHeader className="border-foreground/10 border-b px-6 pt-6 pb-4">
                    <div className="text-muted-foreground mb-2 font-mono text-[9px] tracking-[2px] uppercase">
                        {t("editMode")}
                    </div>
                    <SheetTitle className="font-display text-2xl font-bold tracking-tight">
                        {title}
                    </SheetTitle>
                    {description && (
                        <SheetDescription className="font-body text-muted-foreground text-sm">
                            {description}
                        </SheetDescription>
                    )}
                </SheetHeader>
                {entity !== null && (
                    <SheetFormBody
                        key={formKey}
                        entity={entity}
                        fields={fields}
                        onSave={onSave}
                        onClose={() => onOpenChange(false)}
                    />
                )}
            </SheetContent>
        </Sheet>
    );
}
