import { Header } from "@/components/layout";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <Header />
            {children}
        </>
    );
}
