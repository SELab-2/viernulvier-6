"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { animate } from "animejs";
import type { LucideIcon } from "lucide-react";

interface SectionCardProps {
    children: ReactNode;
    href: string;
    className?: string;
}

export function SectionCard({ children, href, className = "" }: SectionCardProps) {
    const cardRef = useRef<HTMLAnchorElement>(null);

    useEffect(() => {
        const card = cardRef.current;
        if (!card) return;

        const handleEnter = () => {
            animate(card, {
                scale: 1.01,
                ease: "outQuad",
                duration: 200,
            });
        };

        const handleLeave = () => {
            animate(card, {
                scale: 1,
                ease: "outQuad",
                duration: 200,
            });
        };

        card.addEventListener("mouseenter", handleEnter);
        card.addEventListener("mouseleave", handleLeave);

        return () => {
            card.removeEventListener("mouseenter", handleEnter);
            card.removeEventListener("mouseleave", handleLeave);
        };
    }, []);

    return (
        <Link ref={cardRef} href={href} className={className}>
            {children}
        </Link>
    );
}

interface SectionCardContentProps {
    edition: string;
    title: string;
    description: string;
    actionLabel: string;
    icon: LucideIcon;
    comingSoon?: boolean;
}

export function SectionCardContent({
    edition,
    title,
    description,
    actionLabel,
    icon: Icon,
    comingSoon = false,
}: SectionCardContentProps) {
    return (
        <div className="flex flex-col">
            <div className="flex items-start justify-between">
                <div className="text-muted-foreground mb-3 font-mono text-[9px] tracking-[1.4px] uppercase">
                    {edition}
                </div>
                <Icon className="text-muted-foreground/40 group-hover:text-foreground h-5 w-5 transition-colors duration-200" />
            </div>

            {comingSoon && (
                <div className="mb-2 inline-flex">
                    <span className="bg-foreground/10 text-foreground/70 px-1.5 py-0.5 font-mono text-[9px] tracking-[1px]">
                        Binnenkort
                    </span>
                </div>
            )}

            <h2 className="font-display text-foreground mb-2 text-[24px] font-bold tracking-tight sm:text-[26px]">
                {title}
            </h2>

            <div className="bg-foreground mb-3 h-0.5 w-12" />

            <p className="text-muted-foreground font-body text-sm leading-relaxed">{description}</p>

            <div className="text-muted-foreground mt-4 font-mono text-[9px] tracking-[1.4px] uppercase opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <span className="text-foreground inline-block transition-transform duration-200 group-hover:translate-x-1">
                    →
                </span>{" "}
                {actionLabel}
            </div>
        </div>
    );
}
