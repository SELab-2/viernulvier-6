import { CmsSidebar } from "@/components/cms";

export default function ContentLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col lg:flex-row">
            <CmsSidebar />
            <main className="flex-1 p-4 lg:p-8">{children}</main>
        </div>
    );
}
