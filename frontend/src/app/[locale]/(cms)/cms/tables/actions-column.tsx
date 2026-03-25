"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type CopyableKeys<TData> = {
    [K in keyof TData]: TData[K] extends string | number | null | undefined ? K : never;
}[keyof TData];

interface ActionsColumnOptions<TData> {
    label: string;
    copyKey: CopyableKeys<TData>;
    onEdit: (entity: TData) => void;
}

export function makeActionsColumn<TData extends Record<string, unknown>>(
    options: ActionsColumnOptions<TData>
): ColumnDef<TData> {
    const { label, copyKey, onEdit } = options;

    return {
        id: "actions",
        cell: ({ row }) => {
            const entity = row.original;
            const copyValue = String(entity[copyKey] ?? "");

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                            disabled={copyValue === ""}
                            onClick={async () => {
                                try {
                                    await navigator.clipboard.writeText(copyValue);
                                    toast.success(`Copied ${String(copyKey)}`);
                                } catch {
                                    toast.error("Failed to copy to clipboard");
                                }
                            }}
                        >
                            Copy {String(copyKey)}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(entity)}>
                            Edit {label}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    };
}
