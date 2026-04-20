import { articleHandlers } from "./articles.handlers";
import { authHandlers } from "./auth.handlers";
import { eventHandlers } from "./events.handlers";
import { hallHandlers } from "./halls.handlers";
import { importHandlers } from "./import.handlers";
import { locationHandlers } from "./locations.handlers";
import { mediaHandlers } from "./media.handlers";
import { productionHandlers } from "./productions.handlers";
import { spaceHandlers } from "./spaces.handlers";
import { taxonomyHandlers } from "./taxonomy.handlers";

export const handlers = [
    ...articleHandlers,
    ...authHandlers,
    ...eventHandlers,
    ...importHandlers,
    ...locationHandlers,
    ...mediaHandlers,
    ...productionHandlers,
    ...hallHandlers,
    ...spaceHandlers,
    ...taxonomyHandlers,
];
