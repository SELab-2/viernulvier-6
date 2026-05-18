export type UserRole = "admin" | "editor" | "user";

export type UserResponse = {
    id: string;
    username: string;
    email: string;
    role: UserRole;
};

export type GetUsersResponse = UserResponse[];

export type CreateUserRequest = {
    username: string;
    email: string;
    password: string;
    role: UserRole;
};

export type CreateUserResponse = UserResponse;

export type UpdateUserRequest = {
    username: string;
    role: UserRole;
};

export type UpdateUserResponse = UserResponse;
