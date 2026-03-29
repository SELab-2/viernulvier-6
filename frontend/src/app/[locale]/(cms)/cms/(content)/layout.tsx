import { CmsSidebar } from "@/components/cms";

export default function ContentLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-full">
            <CmsSidebar />
            <main className="flex-1 overflow-auto p-8">{children}</main>
        </div>
    );
}
