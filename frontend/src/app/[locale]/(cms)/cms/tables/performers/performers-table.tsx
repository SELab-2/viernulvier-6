"use client";

import { DataTable } from "../data-table";
import { columns, type Performer } from "./columns";

const MOCK_PERFORMERS: Performer[] = [
    {
        name: "Nirvana",
        metadata_status: "partial",
    },
];

interface PerformersTableProps {
    data?: Performer[];
}

export function PerformersTable({ data = MOCK_PERFORMERS }: PerformersTableProps) {
    return <DataTable columns={columns} data={data} />;
}
