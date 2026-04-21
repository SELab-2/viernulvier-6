import { Footer } from "@/components/layout/footer";

export default function WithFooterLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
            <Footer />
        </>
    );
}
