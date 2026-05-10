import { CmsSidebar } from "@/components/cms";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-full flex-col overflow-hidden lg:flex-row">
            <CmsSidebar />
            <main className="flex h-full min-h-0 flex-1 flex-col overflow-hidden px-2 pt-2 lg:px-8 lg:pt-8">
                {children}
            </main>
        </div>
    );
}
