"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/routing";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchInputProps {
    placeholder?: string;
}

export function SearchInput({ placeholder = "Search…" }: SearchInputProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const [value, setValue] = useState(searchParams.get("q") ?? "");

    useEffect(() => {
        const timeout = setTimeout(() => {
            const params = new URLSearchParams(window.location.search);
            if (value) {
                params.set("q", value);
            } else {
                params.delete("q");
            }
            params.delete("cursor");
            const qs = params.toString();
            router.replace(qs ? `${pathname}?${qs}` : pathname);
        }, 300);
        return () => clearTimeout(timeout);
    }, [value, pathname, router]);

    return (
        <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
            <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                className="h-8 w-56 rounded-none pl-8 font-mono text-xs"
            />
        </div>
    );
}
