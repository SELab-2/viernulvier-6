"use client";

import { cn } from "@/lib/utils";

export interface PageHeaderProps {
    title: string;
    subtitle?: React.ReactNode;
    className?: string;
}

export function PageHeader({ title, subtitle, className }: PageHeaderProps) {
    return (
        <div className={cn("flex flex-col gap-2", className)}>
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
        </div>
    );
}
