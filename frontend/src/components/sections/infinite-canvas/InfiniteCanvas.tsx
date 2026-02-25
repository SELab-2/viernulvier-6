"use client";

import * as React from "react";
import type { InfiniteCanvasProps } from "./lib/types";

const LazyCanvasScene = React.lazy(() =>
    import("./CanvasScene").then((mod) => ({ default: mod.CanvasScene }))
);

export function InfiniteCanvas(props: InfiniteCanvasProps) {
    return (
        <React.Suspense fallback={null}>
            {}
            <LazyCanvasScene {...props} />
        </React.Suspense>
    );
}
