export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
            <div className="mx-auto w-full max-w-sm">{children}</div>
        </div>
    );
}
