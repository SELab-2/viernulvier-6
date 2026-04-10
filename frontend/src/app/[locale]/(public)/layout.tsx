import { Footer } from "@/components/layout";
import { UnifiedHeader } from "@/components/layout/header";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <UnifiedHeader />
            <main className="flex-1">{children}</main>
            <Footer />
        </>
    );
}
