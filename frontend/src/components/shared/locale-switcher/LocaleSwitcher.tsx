"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { useParams } from "next/navigation";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export const LocaleSwitcher = () => {
    const t = useTranslations("LocaleSwitcher");
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const params = useParams();

    function onSelectChange(nextLocale: string) {
        router.replace({ pathname, query: params }, { locale: nextLocale });
    }

    return (
        <Select defaultValue={locale} onValueChange={onSelectChange}>
            <SelectTrigger className="w-30">
                <SelectValue placeholder={t("label")} />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="nl">Nederlands</SelectItem>
            </SelectContent>
        </Select>
    );
};
