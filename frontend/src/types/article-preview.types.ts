import { Article, ArticleRelations } from "./models/article.types";

/**
 * Combined article data for preview (article + relations)
 */
export interface ArticlePreviewData {
    article: Article;
    relations: ArticleRelations;
}
