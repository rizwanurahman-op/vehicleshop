import { cookies } from "next/headers";

export const getToken = async (): Promise<string | null> => {
    const cookieStore = await cookies();
    return cookieStore.get("vb_access_token")?.value ?? null;
};
