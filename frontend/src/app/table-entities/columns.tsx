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

export type ProductionEntity = {
    title: string;
    tagline: string;
    performer: string; // TODO: make struct for tjis?
    metadata_status: "partial" | "complete";
};

export const columns: ColumnDef<ProductionEntity>[] = [
    {
        accessorKey: "title",
        header: "Title",
    },
    {
        accessorKey: "performer",
        header: "Performer",
    },
    {
        accessorKey: "tagline",
        header: "Tagline",
    },
    {
        accessorKey: "metadata_status",
        header: "Data",
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const entity = row.original;

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
                            onClick={() => navigator.clipboard.writeText(entity.title)}
                        >
                            Copy title
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
                            View production
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => {
                                /* TODO: */
                            }}
                        >
                            Edit production
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
