import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default function ContentLayout({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider className="h-full min-h-0">
            <AppSidebar />
            <main className="flex-1 overflow-auto p-4">
                <SidebarTrigger />
                {children}
            </main>
        </SidebarProvider>
    );
}
