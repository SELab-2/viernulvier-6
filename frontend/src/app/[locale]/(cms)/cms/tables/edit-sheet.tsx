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

// field configuration types
export interface SelectOption {
    value: string;
    label: string;
}

export type FieldType = "text" | "boolean" | "select";

export interface FieldDef<TData> {
    // key in data object
    key: keyof TData;
    // human readable label shown above input
    label: string;
    // Determines which input control to render
    type: FieldType;
    // Required when type="select". defines the available options
    options?: SelectOption[];
    // render as a read-only display value (for IDs, etc.)
    readOnly?: boolean;
}

// editSheet component
export interface EditSheetProps<TData extends Record<string, unknown>> {
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

// internal field row. rendered once per FieldDef entry
interface FieldRowProps<TData> {
    field: FieldDef<TData>;
    value: unknown;
    onChange: (value: unknown) => void;
}

function FieldRow<TData>({ field, value, onChange }: FieldRowProps<TData>) {
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
                <label className="text-sm font-medium">{field.label}</label>
                <Input
                    value={stringValue}
                    onChange={(e) => onChange(e.target.value)}
                    className="h-8 text-sm"
                />
            </div>
        );
    }

    // "boolean" and "select" both render a Select control
    const options = field.type === "boolean" ? BOOLEAN_OPTIONS : (field.options ?? []);
    const selectValue =
        field.type === "boolean"
            ? value === null || value === undefined
                ? ""
                : String(value)
            : stringValue;

    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{field.label}</label>
            <Select
                value={selectValue}
                onValueChange={(v) => {
                    if (field.type === "boolean") {
                        onChange(v === "true" ? true : v === "false" ? false : null);
                    } else {
                        onChange(v);
                    }
                }}
            >
                <SelectTrigger size="sm" className="w-full">
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

// sheetFormBody. owns local editable state, remounts when entity changes
interface SheetFormBodyProps<TData extends Record<string, unknown>> {
    entity: TData;
    fields: FieldDef<TData>[];
    onSave?: (data: TData) => void;
    onClose: () => void;
}

function SheetFormBody<TData extends Record<string, unknown>>({
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

export function EditSheet<TData extends Record<string, unknown>>({
    open,
    onOpenChange,
    entity,
    fields,
    title,
    description,
    onSave,
}: EditSheetProps<TData>) {
    const formKey = entity !== null ? JSON.stringify(entity) : null;

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
