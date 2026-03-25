import { useTranslations } from "next-intl";

export default function Home() {
    const generalTranslations = useTranslations("General");
    return <h1>{generalTranslations("projectName")}</h1>;
}
