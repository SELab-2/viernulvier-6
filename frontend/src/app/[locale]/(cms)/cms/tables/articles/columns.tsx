"use client";

import { ColumnDef } from "@tanstack/react-table";

export type Article = {
    title: string;
    author: string;
    published_at: string;
    metadata_status: "partial" | "complete";
};

export const columns: ColumnDef<Article>[] = [
    {
        accessorKey: "title",
        header: "Title",
    },
    {
        accessorKey: "author",
        header: "Author",
    },
    {
        accessorKey: "published_at",
        header: "Published",
    },
    {
        accessorKey: "metadata_status",
        header: "Data",
    },
];
