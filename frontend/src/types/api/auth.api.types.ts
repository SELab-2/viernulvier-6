import { components } from "@/types/api/generated";
import { UserRole } from "@/types/models/user.types";

export type UserResponse = components["schemas"]["AdminResponse"] & {
    role?: UserRole | string;
};
export type AuthResponse = components["schemas"]["AuthResponse"];
export type LoginRequest = components["schemas"]["LoginRequest"];

export type CreateEditorRequest = {
    username: string;
    email: string;
    password: string;
};

export type CreatedEditorResponse = {
    id: string;
    email: string;
    role: UserRole | string;
};
