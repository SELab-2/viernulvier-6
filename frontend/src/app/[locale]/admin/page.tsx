"use client";
import { useUser } from "@/hooks/useAuth";
import { useRouter } from "@/i18n/routing";
import { useEffect } from "react";

export default function AdminPage() {
    const { data: user, isLoading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/login");
        }
    }, [user, isLoading, router]);

    if (isLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <p className="text-muted-foreground animate-pulse">Loading admin dashboard...</p>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="container mx-auto max-w-4xl px-4 py-12">
            <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
                    <p className="text-muted-foreground">
                        Welcome back! {user?.email && <span>Email: {user.email}</span>}
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="bg-card rounded-xl border p-6 shadow-sm">
                        <h3 className="font-semibold">Quick Actions</h3>
                        <p className="text-muted-foreground mt-2 text-sm italic">
                            More features coming soon...
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
