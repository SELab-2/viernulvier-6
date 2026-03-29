import { Header } from "@/components/layout";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <Header />
            <div className="flex h-full flex-col items-center justify-center px-4 py-12">
                <div className="w-full max-w-sm">{children}</div>
            </div>
        </>
    );
}
