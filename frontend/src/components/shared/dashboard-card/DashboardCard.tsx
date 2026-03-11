"use client";

import { cn } from "@/lib/utils";

export interface DashboardCardProps {
    title: string;
    children: React.ReactNode;
    className?: string;
}

export function DashboardCard({ title, children, className }: DashboardCardProps) {
    return (
        <div className={cn("bg-card rounded-xl border p-6 shadow-sm", className)}>
            <h3 className="font-semibold">{title}</h3>
            <div className="mt-2">{children}</div>
        </div>
    );
}
