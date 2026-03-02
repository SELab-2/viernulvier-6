import axios from "axios";
import Cookies from "js-cookie";

export const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
});

api.interceptors.request.use((config) => {
    const token = Cookies.get("jwt"); // Or localStorage.getItem('jwt')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
