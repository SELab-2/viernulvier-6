import { useTranslations } from "next-intl";

export default function Home() {
    const t = useTranslations("General");
    return <h1>{t("projectName")}</h1>;
}
