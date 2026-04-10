import { Footer } from "@/components/layout";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col">
            {children}
            <Footer />
        </div>
    );
}
