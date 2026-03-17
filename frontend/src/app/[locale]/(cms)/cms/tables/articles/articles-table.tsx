"use client";

import { DataTable } from "../data-table";
import { columns, type Article } from "./columns";

const MOCK_ARTICLES: Article[] = [
    {
        title: "Article about viernulvier",
        author: "Thomas",
        published_at: "2024-01-01",
        metadata_status: "complete",
    },
];

interface ArticlesTableProps {
    data?: Article[];
}

export function ArticlesTable({ data = MOCK_ARTICLES }: ArticlesTableProps) {
    return <DataTable columns={columns} data={data} />;
}
