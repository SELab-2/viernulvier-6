export interface LoginDTO {
    email: string;
    password: string;
}

export interface AuthResponse {
    token: string;
    user: {
        id: string;
        email: string;
    };
}
