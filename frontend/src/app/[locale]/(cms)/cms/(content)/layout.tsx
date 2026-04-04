import { Suspense } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { CmsTabBar } from "../cms-tab-bar";

export default function ContentLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-full flex-col">
            <CmsTabBar />
            <SidebarProvider className="min-h-0 flex-1">
                <Suspense>
                    <AppSidebar />
                </Suspense>
                <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4">
                    {children}
                </main>
            </SidebarProvider>
        </div>
    );
}
