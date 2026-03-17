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
import { Link, usePathname } from "@/i18n/routing";

const ENTITY_TYPES: { slug: string; label: string }[] = [
    { slug: "productions", label: "Productions" },
    { slug: "articles", label: "Articles" },
    { slug: "venues", label: "Venues" },
    { slug: "performers", label: "Performers" },
];

export function AppSidebar() {
    const pathname = usePathname();

    return (
        <Sidebar>
            <SidebarHeader />
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Content type</SidebarGroupLabel>
                    <SidebarMenu>
                        {ENTITY_TYPES.map((type) => (
                            <SidebarMenuItem key={type.slug}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={pathname === `/cms/${type.slug}`}
                                >
                                    <Link href={`/cms/${type.slug}`}>{type.label}</Link>
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
