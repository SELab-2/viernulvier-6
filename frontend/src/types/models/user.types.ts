export enum UserRole {
    ADMIN = "admin",
    EDITOR = "editor",
    USER = "user",
}

export type User = {
    id: string;
    email: string;
    role: UserRole;
};
