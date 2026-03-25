import { CmsTabBar } from "./cms-tab-bar";

export default function CmsLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen flex-col">
            <CmsTabBar />
            <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        </div>
    );
}
