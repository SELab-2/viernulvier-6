import { ArticleEditorPage } from "./article-editor-page";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function Page({ params }: Props) {
    const { id } = await params;
    return <ArticleEditorPage id={id} />;
}
