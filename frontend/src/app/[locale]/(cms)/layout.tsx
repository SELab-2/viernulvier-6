import { UnifiedHeader } from "@/components/layout/header";

export default function CmsLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen flex-col overflow-hidden">
            <UnifiedHeader />
            <div className="flex-1 overflow-hidden">{children}</div>
        </div>
    );
}
