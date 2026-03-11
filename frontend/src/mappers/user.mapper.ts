import { UserResponse } from "@/types/api/auth.api.types";
import { User } from "@/types/models/user.types";

export const mapUser = (response: UserResponse): User => {
    return {
        id: response.user_id,
        email: response.email,
    };
};
