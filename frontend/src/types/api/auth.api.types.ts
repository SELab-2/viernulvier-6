import { UserRole } from "@/types/models/user.types";

export type UserResponse = {
    user_id: string;
    email: string;
    role: UserRole;
};

export type CreateEditorRequest = {
    username: string;
    email: string;
    password: string;
};

export type CreatedEditorResponse = {
    id: string;
    email: string;
    role: UserRole;
};
