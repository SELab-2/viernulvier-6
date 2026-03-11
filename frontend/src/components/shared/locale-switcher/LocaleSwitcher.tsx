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

const locales = [
    { code: "nl", label: "Nederlands" },
    { code: "en", label: "English" },
];

export const LocaleSwitcher = () => {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const params = useParams();
    const localeSwitcherTranslations = useTranslations("LocaleSwitcher");

    const onSelectChange = (nextLocale: string) => {
        router.replace({ pathname, query: params }, { locale: nextLocale });
    };

    return (
        <Select defaultValue={locale} onValueChange={onSelectChange}>
            <SelectTrigger
                className="text-muted-foreground hover:text-foreground h-9 w-[130px] border-0 bg-transparent text-xs font-medium tracking-wider shadow-none focus:ring-0 [&>svg]:h-4 [&>svg]:w-4"
                aria-label={localeSwitcherTranslations("label")}
            >
                <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
                {locales.map((loc) => (
                    <SelectItem key={loc.code} value={loc.code} className="text-xs">
                        {loc.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
};
