export type UserResponse = {
    user_id: string;
    email: string;
    role: UserRole;
};

export type CreateAdminRequest = {
    username: string;
    email: string;
    password: string;
};
