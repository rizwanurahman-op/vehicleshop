import Cookies from "js-cookie";

const ACCESS_TOKEN_KEY = "vb_access_token";

export const setClientSession = (accessToken: string): void => {
    Cookies.set(ACCESS_TOKEN_KEY, accessToken, {
        expires: 1 / 96, // 15 minutes
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
    });
};

export const getClientSession = (): string | null => {
    return Cookies.get(ACCESS_TOKEN_KEY) ?? null;
};

export const clearClientSession = (): void => {
    Cookies.remove(ACCESS_TOKEN_KEY);
};
