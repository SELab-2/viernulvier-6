import { Footer, Header } from "@/components/layout";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
        </>
    );
}
