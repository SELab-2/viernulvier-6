import { useTranslations } from "next-intl";
import { Check } from "lucide-react";

export type ImportStage = "upload" | "mapping" | "dry_run" | "commit";

const STAGES: ImportStage[] = ["upload", "mapping", "dry_run", "commit"];

type StepState = "completed" | "active" | "upcoming";

interface ImportStepperProps {
    currentStage: ImportStage;
}

interface StepLabelKey {
    stage: ImportStage;
    labelKey: "stepper.upload" | "stepper.mapping" | "stepper.dryRun" | "stepper.commit";
}

const STAGE_LABEL_KEYS: StepLabelKey[] = [
    { stage: "upload", labelKey: "stepper.upload" },
    { stage: "mapping", labelKey: "stepper.mapping" },
    { stage: "dry_run", labelKey: "stepper.dryRun" },
    { stage: "commit", labelKey: "stepper.commit" },
];

function getStepState(stage: ImportStage, currentStage: ImportStage): StepState {
    const stageIndex = STAGES.indexOf(stage);
    const currentIndex = STAGES.indexOf(currentStage);
    if (stageIndex < currentIndex) {
        return "completed";
    }
    if (stageIndex === currentIndex) {
        return "active";
    }
    return "upcoming";
}

export function ImportStepper({ currentStage }: ImportStepperProps) {
    const t = useTranslations("Cms.Import");

    return (
        <nav aria-label="Import progress" className="mb-6">
            <ol className="flex items-center gap-0">
                {STAGE_LABEL_KEYS.map(({ stage, labelKey }, index) => {
                    const state = getStepState(stage, currentStage);
                    const isLast = index === STAGE_LABEL_KEYS.length - 1;

                    return (
                        <li key={stage} className="flex flex-1 items-center last:flex-none">
                            <div className="flex flex-col items-center gap-1.5">
                                <div
                                    className={[
                                        "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                                        state === "completed"
                                            ? "border-foreground bg-foreground text-background"
                                            : state === "active"
                                              ? "border-foreground bg-background text-foreground"
                                              : "border-foreground/20 bg-background text-muted-foreground",
                                    ].join(" ")}
                                    aria-label={state === "completed" ? "completed" : undefined}
                                >
                                    {state === "completed" ? (
                                        <Check className="h-4 w-4" strokeWidth={2.5} />
                                    ) : (
                                        <span>{index + 1}</span>
                                    )}
                                </div>
                                <span
                                    className={[
                                        "font-mono text-[9px] tracking-[1.5px] whitespace-nowrap uppercase",
                                        state === "active"
                                            ? "text-foreground font-semibold"
                                            : state === "completed"
                                              ? "text-foreground/70"
                                              : "text-muted-foreground",
                                    ].join(" ")}
                                >
                                    {t(labelKey)}
                                </span>
                            </div>

                            {!isLast && (
                                <div
                                    className={[
                                        "mx-2 mb-5 h-px flex-1",
                                        state === "completed"
                                            ? "bg-foreground"
                                            : "bg-foreground/15",
                                    ].join(" ")}
                                    aria-hidden="true"
                                />
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
