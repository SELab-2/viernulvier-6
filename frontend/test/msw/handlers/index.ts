import { articleHandlers } from "./articles.handlers";
import { authHandlers } from "./auth.handlers";
import { eventHandlers } from "./events.handlers";
import { hallHandlers } from "./halls.handlers";
import { importErrorHandlers } from "./import-errors.handlers";
import { locationHandlers } from "./locations.handlers";
import { mediaHandlers } from "./media.handlers";
import { productionHandlers } from "./productions.handlers";
import { spaceHandlers } from "./spaces.handlers";
import { taxonomyHandlers } from "./taxonomy.handlers";

export const handlers = [
    ...articleHandlers,
    ...authHandlers,
    ...eventHandlers,
    ...importErrorHandlers,
    ...locationHandlers,
    ...mediaHandlers,
    ...productionHandlers,
    ...hallHandlers,
    ...spaceHandlers,
    ...taxonomyHandlers,
];
