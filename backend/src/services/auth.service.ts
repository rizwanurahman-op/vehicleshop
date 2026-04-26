import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User, IUser } from "../models/user.model";
import { env } from "../config/env";
import { ApiError, ConflictError, NotFoundError, UnauthorizedError } from "../utils/api-error";

interface RegisterInput {
    username: string;
    email: string;
    password: string;
}

interface LoginInput {
    usernameOrEmail: string;
    password: string;
}

interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

const generateTokens = (userId: string, role: string): TokenPair => {
    const accessToken = jwt.sign({ userId, role }, env.JWT_ACCESS_SECRET, {
        expiresIn: env.JWT_ACCESS_EXPIRY as unknown as number,
    });
    const refreshToken = jwt.sign({ userId }, env.JWT_REFRESH_SECRET, {
        expiresIn: env.JWT_REFRESH_EXPIRY as unknown as number,
    });
    return { accessToken, refreshToken };
};

const register = async (data: RegisterInput): Promise<{ user: IUser; tokens: TokenPair }> => {
    // Check if any admin exists already
    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
        throw new ConflictError("An admin account already exists. Only one admin is allowed.");
    }

    const existingUser = await User.findOne({
        $or: [{ username: data.username }, { email: data.email }],
    });
    if (existingUser) {
        throw new ConflictError("Username or email already in use");
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await User.create({
        username: data.username.toLowerCase(),
        email: data.email.toLowerCase(),
        passwordHash,
        role: "admin",
    });

    const tokens = generateTokens(user._id.toString(), user.role);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    return { user, tokens };
};

const login = async (data: LoginInput): Promise<{ user: IUser; tokens: TokenPair }> => {
    const user = await User.findOne({
        $or: [{ username: data.usernameOrEmail.toLowerCase() }, { email: data.usernameOrEmail.toLowerCase() }],
    });
    if (!user) throw new UnauthorizedError("Invalid credentials");

    const isValid = await user.comparePassword(data.password);
    if (!isValid) throw new UnauthorizedError("Invalid credentials");

    const tokens = generateTokens(user._id.toString(), user.role);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    return { user, tokens };
};

const refreshAccessToken = async (refreshToken: string): Promise<string> => {
    let decoded: { userId: string };
    try {
        decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { userId: string };
    } catch {
        throw new UnauthorizedError("Invalid or expired refresh token");
    }

    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedError("Refresh token revoked");
    }

    const accessToken = jwt.sign({ userId: user._id.toString(), role: user.role }, env.JWT_ACCESS_SECRET, {
        expiresIn: env.JWT_ACCESS_EXPIRY as unknown as number,
    });
    return accessToken;
};

const logout = async (userId: string): Promise<void> => {
    await User.findByIdAndUpdate(userId, { refreshToken: null });
};

// Revoke session by refreshToken — used during logout when access token may be expired
const logoutByRefreshToken = async (refreshToken: string): Promise<void> => {
    await User.findOneAndUpdate({ refreshToken }, { refreshToken: null });
};

const getMe = async (userId: string): Promise<IUser> => {
    const user = await User.findById(userId).select("-passwordHash -refreshToken");
    if (!user) throw new NotFoundError("User");
    return user;
};

const authService = { register, login, refreshAccessToken, logout, logoutByRefreshToken, getMe };
export default authService;
