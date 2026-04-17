import { Production, ProductionRow } from "./models/production.types";
import { Event } from "./models/event.types";

/**
 * Combined production data for preview (production + events)
 * Uses ProductionRow (flat) for edit data, Production (nested) for display
 */
export interface ProductionPreviewData {
    production: Production | ProductionRow;
    events: Event[];
}
