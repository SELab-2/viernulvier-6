"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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

const BOOLEAN_OPTIONS: SelectOption[] = [
    { value: "true", label: "Yes" },
    { value: "false", label: "No" },
];

const NULL_SENTINEL = "__null__";

interface FieldRowProps<TData> {
    field: FieldDef<TData>;
    value: unknown;
    onChange: (value: unknown) => void;
}

function FieldRow<TData>({ field, value, onChange }: FieldRowProps<TData>) {
    const fieldId = `field-${String(field.key)}`;
    const stringValue = value === null || value === undefined ? "" : String(value);

    if (field.readOnly) {
        return (
            <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    {field.label}
                </span>
                <p className="text-sm">{stringValue || "—"}</p>
            </div>
        );
    }

    if (field.type === "text") {
        return (
            <div className="flex flex-col gap-1.5">
                <Label htmlFor={fieldId}>{field.label}</Label>
                <Input
                    id={fieldId}
                    value={stringValue}
                    onChange={(e) => onChange(e.target.value)}
                    className="h-8 text-sm"
                />
            </div>
        );
    }

    const options = field.type === "boolean" ? BOOLEAN_OPTIONS : (field.options ?? []);

    if (field.type === "boolean") {
        const selectValue = value === null || value === undefined ? NULL_SENTINEL : String(value);

        return (
            <div className="flex flex-col gap-1.5">
                <Label htmlFor={fieldId}>{field.label}</Label>
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
                    <SelectTrigger id={fieldId} size="sm" className="w-full">
                        <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={NULL_SENTINEL}>—</SelectItem>
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

    return (
        <div className="flex flex-col gap-1.5">
            <Label htmlFor={fieldId}>{field.label}</Label>
            <Select value={stringValue} onValueChange={onChange}>
                <SelectTrigger id={fieldId} size="sm" className="w-full">
                    <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
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
            <div className="flex flex-col gap-5 overflow-y-auto px-6 py-5">
                {fields.map((field) => (
                    <FieldRow
                        key={String(field.key)}
                        field={field}
                        value={values[field.key as keyof typeof values]}
                        onChange={(v) => handleChange(field.key, v)}
                    />
                ))}
            </div>
            <Separator />
            <SheetFooter className="flex-row justify-end gap-2 px-6 py-4">
                <Button variant="outline" size="sm" onClick={onClose}>
                    Cancel
                </Button>
                <Button size="sm" onClick={handleSave}>
                    Save changes
                </Button>
            </SheetFooter>
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
    const formKey = entity?.id ?? null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-md">
                <SheetHeader className="px-6 pt-6 pb-4">
                    <SheetTitle>{title}</SheetTitle>
                    {description && <SheetDescription>{description}</SheetDescription>}
                </SheetHeader>
                <Separator />
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
