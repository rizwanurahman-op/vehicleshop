import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { User, IUser } from "../models/user.model";
import { env } from "../config/env";
import { ApiError, ConflictError, NotFoundError, UnauthorizedError } from "../utils/api-error";
import { sendPasswordResetEmail } from "./email.service";

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
    // jwt.sign() expiresIn expects the branded StringValue type from the ms package.
    // Zod parses env vars as plain string, so we cast to the accepted union type.
    const accessToken = jwt.sign({ userId, role }, env.JWT_ACCESS_SECRET, {
        expiresIn: env.JWT_ACCESS_EXPIRY as jwt.SignOptions["expiresIn"],
    });
    const refreshToken = jwt.sign({ userId }, env.JWT_REFRESH_SECRET, {
        expiresIn: env.JWT_REFRESH_EXPIRY as jwt.SignOptions["expiresIn"],
    });
    return { accessToken, refreshToken };
};

// Pre-computed dummy hash used to prevent timing-based username enumeration.
// When login fails because a user does not exist, we still run bcrypt.compare()
// against this dummy hash so the response time is indistinguishable from a real
// wrong-password failure. Without this, attackers can enumerate valid usernames
// by measuring response latency (user-not-found ~2ms vs wrong-password ~100ms).
// MUST be a valid bcrypt hash of cost 10 so bcrypt.compare() does real work.
const DUMMY_HASH = "$2a$10$8AhGXgCY9XXlArtwvsJqg.kIPgthEqQc7fAKXlPnwt/vQm7hjiqdW";

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

    // Use rounds=10 (OWASP recommended minimum). Rounds=12 is ~800ms on low-power
    // servers (free Render dyno), causing noticeable login delays. 10 rounds ~100ms.
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await User.create({
        username: data.username.toLowerCase(),
        email: data.email.toLowerCase(),
        passwordHash,
        role: "admin",
    });

    const tokens = generateTokens(user._id.toString(), user.role);
    // Use updateOne — avoids a redundant findById round-trip and runs no validators
    await User.updateOne({ _id: user._id }, { $set: { refreshToken: tokens.refreshToken } });

    return { user, tokens };
};

const login = async (data: LoginInput): Promise<{ user: IUser; tokens: TokenPair }> => {
    const user = await User.findOne({
        $or: [{ username: data.usernameOrEmail.toLowerCase() }, { email: data.usernameOrEmail.toLowerCase() }],
    }).select("+passwordHash +refreshToken"); // Explicitly select sensitive fields needed for auth

    // SECURITY: Always run bcrypt.compare() even when user not found.
    // This ensures response time is constant regardless of whether the username
    // exists, preventing timing-based username enumeration attacks.
    const passwordToCheck = user ? (user.passwordHash || DUMMY_HASH) : DUMMY_HASH;
    const isValid = await bcrypt.compare(data.password, passwordToCheck);

    if (!user || !isValid) throw new UnauthorizedError("Invalid credentials");

    const tokens = generateTokens(user._id.toString(), user.role);
    // Use updateOne instead of user.save() — avoids full validator pass and is atomic
    await User.updateOne({ _id: user._id }, { $set: { refreshToken: tokens.refreshToken } });

    return { user, tokens };
};

const refreshAccessToken = async (refreshToken: string): Promise<string> => {
    let decoded: { userId: string };
    try {
        decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { userId: string };
    } catch {
        throw new UnauthorizedError("Invalid or expired refresh token");
    }

    const user = await User.findById(decoded.userId).select("+refreshToken");
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
    // Must use updateOne since refreshToken is select:false — findOneAndUpdate would work too
    await User.updateOne({ refreshToken }, { $set: { refreshToken: null } });
};

const getMe = async (userId: string): Promise<IUser> => {
    const user = await User.findById(userId).select("-passwordHash -refreshToken");
    if (!user) throw new NotFoundError("User");
    return user;
};

interface UpdateProfileInput {
    username?: string;
    email?: string;
}

const updateProfile = async (userId: string, data: UpdateProfileInput): Promise<IUser> => {
    // Check for conflicts on username/email (exclude current user)
    if (data.username || data.email) {
        const orConditions: Array<Record<string, string>> = [];
        if (data.username) orConditions.push({ username: data.username.toLowerCase() });
        if (data.email) orConditions.push({ email: data.email.toLowerCase() });

        const conflict = await User.findOne({
            _id: { $ne: userId },
            $or: orConditions,
        });
        if (conflict) throw new ConflictError("Username or email is already in use");
    }

    const updateData: Record<string, string> = {};
    if (data.username) updateData.username = data.username.toLowerCase();
    if (data.email) updateData.email = data.email.toLowerCase();

    const user = await User.findByIdAndUpdate(userId, updateData, { new: true }).select("-passwordHash -refreshToken");
    if (!user) throw new NotFoundError("User");
    return user;
};

interface ChangePasswordInput {
    currentPassword: string;
    newPassword: string;
}

const changePassword = async (userId: string, data: ChangePasswordInput): Promise<void> => {
    const user = await User.findById(userId).select("+passwordHash");
    if (!user) throw new NotFoundError("User");

    const isValid = await user.comparePassword(data.currentPassword);
    if (!isValid) throw new UnauthorizedError("Current password is incorrect");

    const newHash = await bcrypt.hash(data.newPassword, 10);
    // Use updateOne — avoids running full validators on the user document
    await User.updateOne({ _id: user._id }, { $set: { passwordHash: newHash } });
};

/**
 * Generate a password reset token, store its hash in DB, and send email.
 * SECURITY: Always returns success to prevent user enumeration.
 * (We never reveal whether an email address is registered.)
 */
const forgotPassword = async (email: string): Promise<void> => {
    const user = await User.findOne({ email: email.toLowerCase() });

    // Silently bail if no account found — do NOT throw, to prevent user enumeration
    if (!user) {
        // Simulate processing time to prevent timing-based enumeration attacks
        await new Promise(resolve => setTimeout(resolve, 200 + Math.floor(Math.random() * 200)));
        return;
    }

    // Generate a cryptographically secure random token
    const plainToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(plainToken).digest("hex");

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // Build the reset URL (frontend page that reads the token from query)
    const resetUrl = `${env.CLIENT_URL}/auth/reset-password?token=${plainToken}`;

    try {
        await sendPasswordResetEmail(user.email, resetUrl);
    } catch (emailError) {
        // Roll back the token so the user can try again cleanly
        user.passwordResetToken = null;
        user.passwordResetExpires = null;
        await user.save();
        console.error("Failed to send password reset email:", emailError);
        throw new ApiError(500, "Failed to send reset email. Please try again later.");
    }
};


interface ResetPasswordInput {
    token: string;
    newPassword: string;
}

/**
 * Validate the reset token and set a new password.
 */
const resetPassword = async (data: ResetPasswordInput): Promise<void> => {
    // Hash the plain token to compare against the stored hashed token
    const hashedToken = crypto.createHash("sha256").update(data.token).digest("hex");

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: new Date() }, // token not expired
    }).select("+passwordResetToken +passwordResetExpires +refreshToken");

    if (!user) {
        throw new ApiError(400, "Password reset token is invalid or has expired");
    }

    user.passwordHash = await bcrypt.hash(data.newPassword, 10);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    // Invalidate any existing sessions
    user.refreshToken = null;
    await user.save();
};

const authService = {
    register,
    login,
    refreshAccessToken,
    logout,
    logoutByRefreshToken,
    getMe,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
};
export default authService;
