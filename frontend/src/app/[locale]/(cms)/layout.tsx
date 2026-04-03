import { UnifiedHeader } from "@/components/layout/header";

export default function CmsLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col">
            <UnifiedHeader />
            <div className="flex-1">{children}</div>
        </div>
    );
}
