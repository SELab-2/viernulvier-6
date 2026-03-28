import { Suspense } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { CmsTabBar } from "../cms-tab-bar";

export default function ContentLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-full flex-col">
            <CmsTabBar />
            <SidebarProvider className="min-h-0 flex-1">
                <Suspense>
                    <AppSidebar />
                </Suspense>
                <main className="flex-1 overflow-auto p-4">
                    <SidebarTrigger />
                    {children}
                </main>
            </SidebarProvider>
        </div>
    );
}
