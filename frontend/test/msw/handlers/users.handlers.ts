import { http, HttpResponse } from "msw";

import type { components } from "@/types/api/generated";
import { apiUrl } from "../../utils/env";

const adminUser: components["schemas"]["UserResponse"] = {
    id: "u0000000-0000-0000-0000-000000000001",
    email: "admin@test.com",
    username: "admin",
    role: "admin",
};

const editorUser: components["schemas"]["UserResponse"] = {
    id: "u0000000-0000-0000-0000-000000000002",
    email: "editor@test.com",
    username: "editor",
    role: "editor",
};

export const userHandlers = [
    http.get(apiUrl("/users"), () =>
        HttpResponse.json([adminUser, editorUser] satisfies components["schemas"]["UserResponse"][])
    ),
    http.post(apiUrl("/users"), async ({ request }) => {
        const body = (await request.json()) as { email?: string; username?: string; role?: string };
        return HttpResponse.json(
            {
                id: "u0000000-0000-0000-0000-000000000003",
                email: body.email ?? "new@test.com",
                username: body.username ?? "newuser",
                role: (body.role ?? "editor") as components["schemas"]["UserRole"],
            } satisfies components["schemas"]["UserResponse"],
            { status: 200 }
        );
    }),
    http.put(apiUrl(`/users/${adminUser.id}`), async ({ request }) => {
        const body = (await request.json()) as { username?: string; role?: string };
        return HttpResponse.json({
            ...adminUser,
            username: body.username ?? adminUser.username,
            role: (body.role ?? adminUser.role) as components["schemas"]["UserRole"],
        } satisfies components["schemas"]["UserResponse"]);
    }),
    http.delete(apiUrl(`/users/${editorUser.id}`), () => new HttpResponse(null, { status: 204 })),
];
