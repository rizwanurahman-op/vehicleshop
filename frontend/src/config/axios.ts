import axios from "axios";
import { getClientSession, setClientSession, clearClientSession } from "@/lib/auth";
import { useSessionStore } from "@/stores/session";

const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1",
    withCredentials: true,
    timeout: 15000,
});

// ─── Request Interceptor — attach access token ─────────────────
apiClient.interceptors.request.use(
    config => {
        const token = getClientSession();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    error => Promise.reject(error)
);

// ─── Response Interceptor — auto-refresh on 401 ───────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: unknown) => void; reject: (reason: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Force a full logout: clear cookie + clear Zustand session store
const forceLogout = () => {
    clearClientSession();
    // Access the store outside React — this is safe with Zustand's getState()
    useSessionStore.getState().clearSession();
    if (typeof window !== "undefined") {
        window.location.href = "/auth/login";
    }
};

apiClient.interceptors.response.use(
    response => response,
    async error => {
        const originalRequest = error.config;

        // Never try to refresh on auth-endpoint failures (login, refresh, register).
        // Those routes don't carry an access token, so a 401 there means bad credentials
        // or an expired refresh token — retrying would cause an infinite loop.
        const requestUrl: string = originalRequest.url ?? "";
        const isAuthEndpoint = /\/auth\/(login|refresh|register)/.test(requestUrl);

        if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(token => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return apiClient(originalRequest);
                    })
                    .catch(err => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const { data } = await apiClient.post("/auth/refresh");
                const newToken = data?.data?.accessToken;
                if (newToken) {
                    setClientSession(newToken);
                    apiClient.defaults.headers.common.Authorization = `Bearer ${newToken}`;
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    processQueue(null, newToken);
                    return apiClient(originalRequest);
                }
                // Refresh succeeded but returned no token — force logout
                processQueue(new Error("No token in refresh response"), null);
                forceLogout();
            } catch (refreshError) {
                processQueue(refreshError, null);
                forceLogout();
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;
