export interface SocialLinks {
    linkedin: string;
}

export interface SiteConfig {
    name: string;
    description: string;
    url: string;
    locale: string;
    themeColor: string;
    keywords: string[];
    social: SocialLinks;
    //ogImage: string;
    languages: Record<string, string>;
}
