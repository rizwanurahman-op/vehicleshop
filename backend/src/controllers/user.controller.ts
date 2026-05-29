import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/user.model";
import { apiResponse } from "../utils/api-response";
import { AuthRequest } from "../middleware/auth.middleware";
import { ConflictError, NotFoundError, ForbiddenError } from "../utils/api-error";

// GET /users — list all users (admin sees all; viewers cannot access this route)
export const listUsers = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const users = await User.find()
            .select("_id username email role createdAt")
            .sort({ createdAt: -1 });
        res.status(200).json(apiResponse(200, "Users fetched", users));
    } catch (error) {
        next(error);
    }
};

// POST /users — admin creates a viewer account
export const createViewer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { username, email, password } = req.body as { username: string; email: string; password: string };

        const existing = await User.findOne({
            $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }],
        });
        if (existing) throw new ConflictError("Username or email is already in use");

        const passwordHash = await bcrypt.hash(password, 12);
        const user = await User.create({
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            passwordHash,
            role: "viewer", // always viewer — admin cannot create another admin via this endpoint
        });

        res.status(201).json(
            apiResponse(201, "Viewer account created", {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt,
            })
        );
    } catch (error) {
        next(error);
    }
};

// DELETE /users/:id — admin deletes a viewer account
export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;

        // Prevent self-deletion
        if (id === req.user!.userId) {
            throw new ForbiddenError("You cannot delete your own account");
        }

        const user = await User.findById(id);
        if (!user) throw new NotFoundError("User");

        // Cannot delete another admin
        if (user.role === "admin") {
            throw new ForbiddenError("Cannot delete an admin account");
        }

        await User.findByIdAndDelete(id);
        res.status(200).json(apiResponse(200, "User deleted successfully"));
    } catch (error) {
        next(error);
    }
};
