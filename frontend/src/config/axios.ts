import axios from "axios";
import { setClientSession, clearClientSession } from "@/lib/auth";
import { useSessionStore } from "@/stores/session";

const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "https://vehicleshop-hk7l.onrender.com/api/v1",
    withCredentials: true, // Required: sends httpOnly cookies (refreshToken, vb_access_token) to backend
    timeout: 15000,
});

// ─── Request Interceptor — attach access token from Zustand memory ──────────
// The vb_access_token is httpOnly — JS cannot read it from cookies.
// Instead we read it from the Zustand store (held in memory, not persisted).
apiClient.interceptors.request.use(
    config => {
        const token = useSessionStore.getState().accessToken;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    error => Promise.reject(error)
);

// ─── Response Interceptor — auto-refresh on 401 ───────────────────────────
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

// Force a full logout: clear expiry marker + clear Zustand session store.
// The httpOnly cookie is cleared by the backend /auth/logout endpoint.
const forceLogout = () => {
    clearClientSession();
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
                // withCredentials sends the httpOnly refreshToken cookie automatically
                const { data } = await apiClient.post("/auth/refresh");
                const newToken = data?.data?.accessToken;
                if (newToken) {
                    // Update in-memory store and record expiry for proactive refresh
                    useSessionStore.getState().setSession(useSessionStore.getState().user!, newToken);
                    setClientSession(newToken); // records expiry in localStorage
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
