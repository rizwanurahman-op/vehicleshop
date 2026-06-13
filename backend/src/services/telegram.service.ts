import fs from "fs";
import https from "https";
import FormData from "form-data";
import { env } from "../config/env";

// ─── Check if Telegram is configured ─────────────────────────────────────────

export const isTelegramConfigured = (): boolean =>
    !!(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID);

// ─── Build Telegram API URL ───────────────────────────────────────────────────

const apiUrl = (method: string) =>
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`;

// ─── Simple HTTPS POST helper ─────────────────────────────────────────────────

const httpsPost = (url: string, body: string | Buffer, headers: Record<string, string>): Promise<unknown> => {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const req = https.request(
            {
                hostname: parsed.hostname,
                path: parsed.pathname,
                method: "POST",
                headers,
            },
            (res) => {
                const chunks: Buffer[] = [];
                res.on("data", (chunk: Buffer) => chunks.push(chunk));
                res.on("end", () => {
                    try {
                        resolve(JSON.parse(Buffer.concat(chunks).toString()));
                    } catch {
                        resolve({});
                    }
                });
            }
        );
        req.on("error", reject);
        req.setTimeout(120_000, () => {
            req.destroy(new Error("Telegram upload timed out (120s)"));
        });
        req.write(body);
        req.end();
    });
};

// ─── Upload result ────────────────────────────────────────────────────────────

export interface TelegramUploadResult {
    fileId: string;
    messageId: number;
    messageLink: string;
}

// ─── Upload a file to the configured Telegram chat ───────────────────────────

export const uploadBackupToTelegram = async (
    localFilePath: string,
    fileName: string,
    caption: string
): Promise<TelegramUploadResult> => {
    if (!isTelegramConfigured()) {
        throw new Error("Telegram credentials not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.");
    }

    const form = new FormData();
    form.append("chat_id", env.TELEGRAM_CHAT_ID!);
    form.append("caption", caption);
    form.append("parse_mode", "HTML");
    form.append("document", fs.createReadStream(localFilePath), {
        filename: fileName,
        contentType: "application/zip",
    });

    // Pipe the form into a buffer so we can POST it over https
    // NOTE: form-data can emit both Buffer and string chunks (e.g. boundaries).
    // Buffer.concat() requires all items to be Buffers, so we coerce with Buffer.from().
    const buffer: Buffer = await new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        form.on("data", (chunk: Buffer | string) =>
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        );
        form.on("end", () => resolve(Buffer.concat(chunks)));
        form.on("error", reject);
        form.resume(); // trigger 'data' events
    });

    const result = await httpsPost(
        apiUrl("sendDocument"),
        buffer,
        { ...form.getHeaders(), "Content-Length": String(buffer.length) }
    ) as { ok: boolean; description?: string; result: { message_id: number; document?: { file_id: string } } };

    if (!result.ok) {
        throw new Error(`Telegram API error: ${result.description}`);
    }

    const msg = result.result;
    const fileId = msg.document?.file_id ?? "";
    const messageId: number = msg.message_id;

    const chatId = env.TELEGRAM_CHAT_ID!;
    const messageLink = chatId.startsWith("-100")
        ? `https://t.me/c/${chatId.replace("-100", "")}/${messageId}`
        : `https://t.me/${chatId.replace("@", "")}/${messageId}`;

    return { fileId, messageId, messageLink };
};

// ─── Delete a message from Telegram ──────────────────────────────────────────

const httpsPostJson = (url: string, body: object): Promise<unknown> => {
    const payload = JSON.stringify(body);
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const req = https.request(
            {
                hostname: parsed.hostname,
                path: parsed.pathname,
                method: "POST",
                headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
            },
            (res) => {
                const chunks: Buffer[] = [];
                res.on("data", (c: Buffer) => chunks.push(c));
                res.on("end", () => {
                    try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
                    catch { resolve({}); }
                });
            }
        );
        req.on("error", reject);
        req.setTimeout(10_000, () => req.destroy());
        req.write(payload);
        req.end();
    });
};

export const deleteBackupFromTelegram = async (messageId: number): Promise<void> => {
    if (!isTelegramConfigured()) return;
    try {
        await httpsPostJson(apiUrl("deleteMessage"), {
            chat_id: env.TELEGRAM_CHAT_ID,
            message_id: messageId,
        });
    } catch (err) {
        console.warn("⚠️  Could not delete Telegram message:", err);
    }
};

export const sendTelegramMessage = async (text: string): Promise<void> => {
    if (!isTelegramConfigured()) return;
    try {
        await httpsPostJson(apiUrl("sendMessage"), {
            chat_id: env.TELEGRAM_CHAT_ID,
            text,
            parse_mode: "HTML",
        });
    } catch { /* Non-fatal */ }
};

// ─── Test connection ──────────────────────────────────────────────────────────

export const testTelegramConnection = async (): Promise<{ connected: boolean; botName: string; chatId: string }> => {
    const result = await new Promise<{ ok: boolean; result: { username: string } }>((resolve, reject) => {
        https.get(apiUrl("getMe"), (res) => {
            const chunks: Buffer[] = [];
            res.on("data", (c: Buffer) => chunks.push(c));
            res.on("end", () => {
                try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
                catch { reject(new Error("Invalid JSON from Telegram")); }
            });
        }).on("error", reject);
    });

    if (!result.ok) throw new Error("Telegram getMe failed");
    return { connected: true, botName: result.result.username, chatId: env.TELEGRAM_CHAT_ID! };
};

const telegramService = {
    isTelegramConfigured,
    uploadBackupToTelegram,
    deleteBackupFromTelegram,
    sendTelegramMessage,
    testTelegramConnection,
};

export default telegramService;
