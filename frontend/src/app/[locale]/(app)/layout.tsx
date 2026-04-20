import { Footer } from "@/components/layout/footer";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col">
            <main className="mx-auto w-full max-w-7xl flex-1">{children}</main>
            <div className="mx-auto w-full max-w-7xl">
                <Footer />
            </div>
        </div>
    );
}
