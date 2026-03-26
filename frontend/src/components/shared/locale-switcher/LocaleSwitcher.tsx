"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export const LocaleSwitcher = () => {
    const localeSwitcherTranslations = useTranslations("LocaleSwitcher");
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();

    function onSelectChange(nextLocale: string) {
        router.replace(pathname, { locale: nextLocale });
    }

    return (
        <Select defaultValue={locale} onValueChange={onSelectChange}>
            <SelectTrigger className="w-30">
                <SelectValue placeholder={localeSwitcherTranslations("label")} />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="nl">Nederlands</SelectItem>
            </SelectContent>
        </Select>
    );
};
