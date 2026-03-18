import { UserResponse } from "@/types/api/auth.api.types";
import { User, UserRole } from "@/types/models/user.types";

export const mapUser = (response: UserResponse): User => {
    const roleString = response.role?.toLowerCase();

    const role = Object.values(UserRole).includes(roleString as UserRole)
        ? (roleString as UserRole)
        : UserRole.USER;

    return {
        id: response.user_id,
        email: response.email,
        role: role,
    };
};
