import { getTranslations } from "next-intl/server";
import { Hero } from "@/components/sections";
import { HomeCanvas } from "./HomeCanvas";

export default async function HomePage() {
    const homeTranslations = await getTranslations("Home");
    const generalTranslations = await getTranslations("General");

    return (
        <div className="relative flex-1 overflow-hidden">
            <HomeCanvas />
            <Hero
                brand={generalTranslations("brandName")}
                title={homeTranslations("hero.title")}
                subtitle={homeTranslations("hero.subtitle")}
                ctaText={homeTranslations("hero.ctaText")}
                ctaHref={homeTranslations("hero.ctaHref")}
            />
        </div>
    );
}
