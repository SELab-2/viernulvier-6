import { useCallback, useMemo, useState } from "react";

import { useGetEntityTags, useReplaceEntityTags } from "@/hooks/api/useEntityTags";
import { EntityType } from "@/types/models/taxonomy.types";

export function useEntityTagEditor(
    entityType: EntityType,
    entityId: string,
    options?: { enabled?: boolean }
) {
    const { data: entityTags } = useGetEntityTags(entityType, entityId, options);
    const replaceEntityTags = useReplaceEntityTags();
    const [tagEdits, setTagEdits] = useState<string[] | null>(null);

    const baseTagSlugs = useMemo(() => {
        if (!entityTags) return [];
        return entityTags.flatMap((f) => f.tags.filter((t) => !t.inherited).map((t) => t.slug));
    }, [entityTags]);

    const inheritedTagSlugs = useMemo(() => {
        if (!entityTags) return [];
        return entityTags.flatMap((f) => f.tags.filter((t) => t.inherited).map((t) => t.slug));
    }, [entityTags]);

    const tagSlugs = tagEdits ?? baseTagSlugs;

    const resetTagEdits = useCallback(() => setTagEdits(null), []);

    return { tagSlugs, inheritedTagSlugs, setTagEdits, resetTagEdits, replaceEntityTags };
}
