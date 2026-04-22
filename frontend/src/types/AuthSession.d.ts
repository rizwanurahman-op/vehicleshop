interface AuthSession {
    id: string;
    username: string;
    email: string;
    role: "admin" | "viewer";
}
