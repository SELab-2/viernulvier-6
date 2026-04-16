import { Footer } from "@/components/layout";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
            <div className="mx-auto w-full max-w-7xl">
                <Footer />
            </div>
        </div>
    );
}
