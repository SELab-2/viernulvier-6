import { UserResponse } from "@/types/api/auth.api.types";
import { User, UserRole } from "@/types/models/user.types";

const normalizeRole = (role: UserResponse["role"]): UserRole => {
    const roleString = role?.toString().toLowerCase();

    if (!roleString) {
        return UserRole.USER;
    }

    return Object.values(UserRole).includes(roleString as UserRole)
        ? (roleString as UserRole)
        : UserRole.USER;
};

export const mapUser = (response: UserResponse): User => {
    return {
        id: response.id,
        email: response.email,
        role: normalizeRole(response.role),
    };
};
