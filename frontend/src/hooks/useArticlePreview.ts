import { usePreviewContext } from "@/contexts/PreviewContext";
import { ArticlePreviewData } from "@/types/article-preview.types";
import { Article, ArticleRelations } from "@/types/models/article.types";

import { useMounted } from "./useMounted";

/**
 * Hook to get article preview data including relations.
 * Returns null if no preview exists.
 */
export function useArticlePreview(slug: string): ArticlePreviewData | null {
    const { getPreview } = usePreviewContext();
    const mounted = useMounted();

    if (!mounted) return null;

    const data = getPreview<ArticlePreviewData>("article", slug);
    return data;
}

/**
 * Hook to merge article API data with preview data.
 * Returns preview data if available, otherwise falls back to API data.
 */
export function useArticleWithPreview(
    slug: string,
    apiArticle: Article | undefined
): Article | undefined {
    const preview = useArticlePreview(slug);
    if (preview) return preview.article;
    return apiArticle;
}

/**
 * Hook to get article relations from preview or return defaults.
 */
export function useArticleRelationsWithPreview(slug: string): ArticleRelations | null {
    const preview = useArticlePreview(slug);
    if (preview) return preview.relations;
    return null;
}
