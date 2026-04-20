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
            <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 pt-12">
                <Spinner className="size-8" />
            </div>
        );
    }

    if (sessionError) {
        return (
            <p role="alert" className="text-destructive pt-4 text-sm">
                {t("errors.sessionLoadFailed")}
            </p>
        );
    }

    if (session?.status === "failed") {
        return (
            <div className="mx-auto max-w-3xl space-y-4 pt-4">
                <p role="alert" className="text-destructive text-sm">
                    {t("commit.failed")}
                </p>
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
            <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 pt-12">
                <Spinner className="size-8" />
                <p className="text-muted-foreground text-sm">{t("commit.completed")}</p>
            </div>
        );
    }

    return (
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 pt-12">
            <Spinner className="size-8" />
            <p className="text-muted-foreground text-sm">{t("commit.running")}</p>
        </div>
    );
}
