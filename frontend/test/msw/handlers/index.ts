import { authHandlers } from "./auth.handlers";
import { eventHandlers } from "./events.handlers";
import { hallHandlers } from "./halls.handlers";
import { locationHandlers } from "./locations.handlers";
import { productionHandlers } from "./productions.handlers";
import { spaceHandlers } from "./spaces.handlers";

export const handlers = [
    ...authHandlers,
    ...eventHandlers,
    ...locationHandlers,
    ...productionHandlers,
    ...hallHandlers,
    ...spaceHandlers,
];
