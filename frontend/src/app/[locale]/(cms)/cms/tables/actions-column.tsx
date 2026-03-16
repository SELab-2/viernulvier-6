"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ActionsColumnOptions {
    /** Label used in "View {label}" and "Edit {label}" menu items */
    label: string;
    /** Key of the row's field to copy as the identifier (e.g. "title", "name") */
    copyKey: string;
}

export function makeActionsColumn<TData extends Record<string, unknown>>(
    options: ActionsColumnOptions
): ColumnDef<TData> {
    const { label, copyKey } = options;

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
                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(copyValue)}>
                            Copy {label}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => {
                                /* TODO: copy entity URL */
                            }}
                        >
                            Copy link
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => {
                                /* TODO: */
                            }}
                        >
                            View {label}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => {
                                /* TODO: */
                            }}
                        >
                            Edit {label}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    };
}
