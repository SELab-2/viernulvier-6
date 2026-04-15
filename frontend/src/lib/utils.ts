import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}

export function getTranslation<T extends { languageCode: string }>(
    translations: T[],
    languageCode: string
): T | undefined {
    return translations.find((t) => t.languageCode === languageCode);
}

export function getLabel(
    translations: { languageCode: string; label: string }[],
    locale: string
): string {
    return getTranslation(translations, locale)?.label ?? translations[0]?.label ?? "";
}

export function groupArticlesByYearMonth<T extends { subjectPeriodStart: string | null }>(
    articles: T[]
): Array<{ year: number; months: Array<{ month: number; monthName: string; articles: T[] }> }> {
    const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];

    // Group by year and month
    const grouped = articles.reduce(
        (acc, article) => {
            if (!article.subjectPeriodStart) return acc;
            const date = new Date(article.subjectPeriodStart);
            const year = date.getFullYear();
            const month = date.getMonth();

            let yearGroup = acc.find((g) => g.year === year);
            if (!yearGroup) {
                yearGroup = { year, months: [] };
                acc.push(yearGroup);
            }

            let monthGroup = yearGroup.months.find((m) => m.month === month);
            if (!monthGroup) {
                monthGroup = { month, monthName: monthNames[month], articles: [] };
                yearGroup.months.push(monthGroup);
            }

            monthGroup.articles.push(article);
            return acc;
        },
        [] as Array<{
            year: number;
            months: Array<{ month: number; monthName: string; articles: T[] }>;
        }>
    );

    // Sort by year descending, months descending, and articles by date descending
    return grouped
        .sort((a, b) => b.year - a.year)
        .map((yearGroup) => ({
            ...yearGroup,
            months: yearGroup.months
                .sort((a, b) => b.month - a.month)
                .map((monthGroup) => ({
                    ...monthGroup,
                    articles: monthGroup.articles.sort((a, b) => {
                        const dateA = a.subjectPeriodStart
                            ? new Date(a.subjectPeriodStart).getTime()
                            : 0;
                        const dateB = b.subjectPeriodStart
                            ? new Date(b.subjectPeriodStart).getTime()
                            : 0;
                        return dateB - dateA;
                    }),
                })),
        }));
}
