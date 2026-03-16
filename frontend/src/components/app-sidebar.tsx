"use client";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useRouter, useSearchParams } from "next/navigation";
import type { ContentType } from "@/app/[locale]/(cms)/cms/entity-table";

const ENTITY_TYPES: { value: ContentType; label: string }[] = [
    { value: "productions", label: "Productions" },
    { value: "articles", label: "Articles" },
    { value: "venues", label: "Venues" },
    { value: "performers", label: "Performers" },
];

export function AppSidebar({ activeType }: { activeType: ContentType }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    function handleTypeChange(type: ContentType) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("type", type);
        router.replace(`?${params.toString()}`);
    }

    return (
        <Sidebar>
            <SidebarHeader />
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Content type</SidebarGroupLabel>
                    <SidebarMenu>
                        {ENTITY_TYPES.map((type) => (
                            <SidebarMenuItem key={type.value}>
                                <SidebarMenuButton
                                    isActive={activeType === type.value}
                                    onClick={() => handleTypeChange(type.value)}
                                >
                                    {type.label}
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter />
        </Sidebar>
    );
}
