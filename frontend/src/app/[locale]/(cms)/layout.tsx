import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { UnifiedHeader } from "@/components/layout/header";
import { buildCookieHeader, hasValidCmsSession } from "@/lib/server-auth";

export default async function CmsLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const [{ locale }, cookieStore] = await Promise.all([params, cookies()]);
    const cookieHeader = buildCookieHeader(cookieStore.getAll());

    if (!(await hasValidCmsSession(cookieHeader))) {
        redirect(`/${locale}/login`);
    }

    return (
        <div className="flex h-screen flex-col overflow-hidden">
            <UnifiedHeader />
            <div className="flex-1 overflow-hidden">{children}</div>
        </div>
    );
}
