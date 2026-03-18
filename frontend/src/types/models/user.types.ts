export enum UserRole {
    SUPER_ADMIN = "superadmin",
    ADMIN = "admin",
    USER = "user",
}

export type User = {
    id: string;
    email: string;
    role: UserRole;
};
