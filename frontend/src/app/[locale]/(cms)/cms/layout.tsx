export default function CmsLayout({ children }: { children: React.ReactNode }) {
    return <div className="flex h-screen flex-col">{children}</div>;
}
