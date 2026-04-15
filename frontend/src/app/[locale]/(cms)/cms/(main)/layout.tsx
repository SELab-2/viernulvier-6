import { CmsSidebar } from "@/components/cms";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-full flex-col overflow-hidden lg:flex-row">
            <CmsSidebar />
            <main className="flex-1 overflow-hidden p-2 lg:p-8">{children}</main>
        </div>
    );
}
