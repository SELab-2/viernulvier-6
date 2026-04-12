type TiptapNode = {
    type: string;
    attrs?: Record<string, unknown>;
    content?: TiptapNode[];
    [key: string]: unknown;
};

export function resolveMediaContent(
    content: Record<string, unknown>,
    mediaMap: Record<string, string>
): Record<string, unknown> {
    return resolveNode(content as TiptapNode, mediaMap) as Record<string, unknown>;
}

function resolveNode(node: TiptapNode, mediaMap: Record<string, string>): TiptapNode {
    if (node.type === "image") {
        const mediaId = node.attrs?.mediaId;
        if (typeof mediaId === "string" && mediaId in mediaMap) {
            return {
                ...node,
                attrs: { ...node.attrs, src: mediaMap[mediaId] },
            };
        }
        return node;
    }

    if (!node.content) return node;

    return {
        ...node,
        content: node.content.map((child) => resolveNode(child, mediaMap)),
    };
}
