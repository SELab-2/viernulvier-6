"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CmsDashboardPage() {
    return (
        <Tabs defaultValue="overview" className="flex h-screen flex-col">
            <TabsList variant="line" className="w-full justify-start rounded-none border-b px-4">
                <TabsTrigger value="overview" className="flex-none">
                    Overview
                </TabsTrigger>
                <TabsTrigger value="content" className="flex-none">
                    Content
                </TabsTrigger>
                <TabsTrigger value="ingestion" className="flex-none">
                    Ingest
                </TabsTrigger>
                <TabsTrigger value="import" className="flex-none">
                    Automatic import
                </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="flex-1 p-4">
                Overview content
            </TabsContent>

            <TabsContent value="content" className="m-0 flex-1 overflow-hidden">
                <SidebarProvider className="h-full min-h-0">
                    <AppSidebar />
                    <main className="flex-1 overflow-auto p-4">
                        <SidebarTrigger />
                        Content table goes here
                    </main>
                </SidebarProvider>
            </TabsContent>

            <TabsContent value="ingestion" className="flex-1 p-4">
                Ingestion content (bulk media import and metadata attachment)
            </TabsContent>

            <TabsContent value="import" className="flex-1 p-4">
                Status of the automatic marketing website import. Errors, graph, data...
            </TabsContent>
        </Tabs>
    );
}
