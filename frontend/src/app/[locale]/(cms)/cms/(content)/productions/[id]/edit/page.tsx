import { ProductionEditorPage } from "./production-editor-page";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function Page({ params }: Props) {
    const { id } = await params;
    return <ProductionEditorPage id={id} />;
}
