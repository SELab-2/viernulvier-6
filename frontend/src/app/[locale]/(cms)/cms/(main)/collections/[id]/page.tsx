import { CollectionEditorPage } from "./collection-editor-page";

type CollectionPageProps = {
    params: Promise<{ id: string }>;
};

export default async function CollectionPage({ params }: CollectionPageProps) {
    const { id } = await params;
    return <CollectionEditorPage id={id} />;
}
