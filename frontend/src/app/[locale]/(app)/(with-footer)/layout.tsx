import { Footer } from "@/components/layout";

export default function WithFooterLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
            <Footer />
        </>
    );
}
