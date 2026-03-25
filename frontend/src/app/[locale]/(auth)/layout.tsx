export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
            <div className="w-full max-w-sm">{children}</div>
        </div>
    );
}
