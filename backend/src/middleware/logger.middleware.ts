import morgan, { StreamOptions } from "morgan";
import { env } from "../config/env";

const stream: StreamOptions = {
    write: (message: string) => console.log(message.trim()),
};

export const requestLogger = morgan(
    env.NODE_ENV === "production" ? "combined" : "dev",
    { stream }
);
