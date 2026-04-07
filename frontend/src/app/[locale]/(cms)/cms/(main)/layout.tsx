import { CmsTabBar } from "../cms-tab-bar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-full flex-col">
            <CmsTabBar />
            <div className="min-h-0 flex-1 overflow-auto">{children}</div>
        </div>
    );
}
