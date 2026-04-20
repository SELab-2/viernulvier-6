"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { useImportSession } from "@/hooks/api/useImport";
import { Link, useRouter } from "@/i18n/routing";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";

type CommitStageProps = {
    sessionId: string;
};

export function CommitStage({ sessionId }: CommitStageProps) {
    const t = useTranslations("Cms.Import");
    const router = useRouter();

    const {
        data: session,
        isPending: sessionLoading,
        isError: sessionError,
    } = useImportSession(sessionId);

    useEffect(() => {
        if (session?.status === "committed") {
            router.push(`/cms/import/history/${sessionId}`);
        }
    }, [session?.status, sessionId, router]);

    if (sessionLoading) {
        return (
            <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 pt-16">
                <Spinner className="size-8" />
                <p className="text-muted-foreground text-sm">{t("commit.helperText")}</p>
            </div>
        );
    }

    if (sessionError) {
        return (
            <div
                role="alert"
                className="border-destructive/40 bg-destructive/10 text-destructive mx-auto mt-4 max-w-3xl rounded-md border px-4 py-3 text-sm"
            >
                <p className="font-medium">{t("errors.sessionLoadFailed")}</p>
            </div>
        );
    }

    if (session?.status === "failed") {
        return (
            <div className="mx-auto max-w-3xl space-y-4 pt-4">
                <div
                    role="alert"
                    className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-4 py-3 text-sm"
                >
                    <p className="font-medium">{t("commit.failed")}</p>
                </div>
                <Button variant="outline" asChild>
                    <Link href={`/cms/import?session=${sessionId}`}>
                        {t("commit.backToDryRun")}
                    </Link>
                </Button>
            </div>
        );
    }

    if (session?.status === "committed") {
        return (
            <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 pt-16">
                <Spinner className="size-8" />
                <p className="text-muted-foreground text-sm">{t("commit.completed")}</p>
            </div>
        );
    }

    return (
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 pt-16">
            <Spinner className="size-8" />
            <p className="text-muted-foreground text-sm">{t("commit.running")}</p>
            <p className="text-muted-foreground/70 text-xs">{t("commit.helperText")}</p>
        </div>
    );
}
