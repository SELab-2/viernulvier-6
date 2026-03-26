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
