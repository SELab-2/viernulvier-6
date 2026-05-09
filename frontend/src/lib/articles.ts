export function groupArticlesByYearMonth<T extends { subjectPeriodStart: string | null }>(
    articles: T[],
    locale: string = "en"
): Array<{ year: number; months: Array<{ month: number; monthName: string; articles: T[] }> }> {
    const monthFormatter = new Intl.DateTimeFormat(locale, { month: "long" });
    const monthNames = Array.from({ length: 12 }, (_, i) => {
        const date = new Date(Date.UTC(2000, i, 1));
        return monthFormatter.format(date);
    });

    const groupedByYear = new Map<
        number,
        {
            year: number;
            months: Map<number, { month: number; monthName: string; articles: T[] }>;
        }
    >();

    for (const article of articles) {
        if (!article.subjectPeriodStart) continue;

        const [yearStr, monthStr] = article.subjectPeriodStart.split("-");
        const year = Number(yearStr);
        const month = Number(monthStr) - 1;

        if (!Number.isInteger(year) || !Number.isInteger(month) || month < 0 || month > 11) {
            continue;
        }

        let yearGroup = groupedByYear.get(year);
        if (!yearGroup) {
            yearGroup = { year, months: new Map() };
            groupedByYear.set(year, yearGroup);
        }

        let monthGroup = yearGroup.months.get(month);
        if (!monthGroup) {
            monthGroup = { month, monthName: monthNames[month], articles: [] };
            yearGroup.months.set(month, monthGroup);
        }

        monthGroup.articles.push(article);
    }

    return Array.from(groupedByYear.values())
        .sort((a, b) => b.year - a.year)
        .map((yearGroup) => ({
            year: yearGroup.year,
            months: Array.from(yearGroup.months.values())
                .sort((a, b) => b.month - a.month)
                .map((monthGroup) => ({
                    month: monthGroup.month,
                    monthName: monthGroup.monthName,
                    articles: monthGroup.articles.sort((a, b) => {
                        const dateA = a.subjectPeriodStart ?? "";
                        const dateB = b.subjectPeriodStart ?? "";
                        return dateB.localeCompare(dateA);
                    }),
                })),
        }));
}
