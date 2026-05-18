import { artistHandlers } from "./artists.handlers";
import { articleHandlers } from "./articles.handlers";
import { authHandlers } from "./auth.handlers";
import { collectionHandlers } from "./collections.handlers";
import { entityTagHandlers } from "./entity-tags.handlers";
import { eventHandlers } from "./events.handlers";
import { hallHandlers } from "./halls.handlers";
import { importErrorHandlers } from "./import-errors.handlers";
import { locationHandlers } from "./locations.handlers";
import { mediaHandlers } from "./media.handlers";
import { productionHandlers } from "./productions.handlers";
import { spaceHandlers } from "./spaces.handlers";
import { statsHandlers } from "./stats.handlers";
import { taxonomyHandlers } from "./taxonomy.handlers";
import { userHandlers } from "./users.handlers";

export const handlers = [
    ...artistHandlers,
    ...articleHandlers,
    ...authHandlers,
    ...collectionHandlers,
    ...entityTagHandlers,
    ...eventHandlers,
    ...importErrorHandlers,
    ...locationHandlers,
    ...mediaHandlers,
    ...productionHandlers,
    ...hallHandlers,
    ...spaceHandlers,
    ...statsHandlers,
    ...taxonomyHandlers,
    ...userHandlers,
];
