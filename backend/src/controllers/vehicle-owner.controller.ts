import { Request, Response } from "express";
import * as vos from "../services/vehicle-owner.service";
import { createVehicleOwnerSchema, updateVehicleOwnerSchema } from "../schemas/consignment.schema";

const validationError = (res: Response, errors: unknown[]) =>
    res.status(400).json({ success: false, statusCode: 400, message: "Validation failed", errors: (errors as { path?: string[]; message: string }[]).map(e => ({ field: (e.path ?? []).join("."), message: e.message })) });

export const createVehicleOwner = async (req: Request, res: Response): Promise<void> => {
    const parsed = createVehicleOwnerSchema.safeParse(req.body);
    if (!parsed.success) { validationError(res, parsed.error.errors); return; }
    const owner = await vos.createVehicleOwner(parsed.data as never);
    res.status(201).json({ success: true, statusCode: 201, message: "Vehicle owner created", data: owner });
};

export const getVehicleOwners = async (req: Request, res: Response): Promise<void> => {
    const { search, page = "1", limit = "50" } = req.query as Record<string, string>;
    const result = await vos.getVehicleOwners({ search, page: +page, limit: +limit });
    res.json({ success: true, statusCode: 200, message: "Vehicle owners fetched", data: result });
};

export const getVehicleOwner = async (req: Request, res: Response): Promise<void> => {
    const owner = await vos.getVehicleOwnerWithSummary(req.params.id as string);
    if (!owner) { res.status(404).json({ success: false, statusCode: 404, message: "Owner not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Owner fetched", data: owner });
};

export const updateVehicleOwner = async (req: Request, res: Response): Promise<void> => {
    const parsed = updateVehicleOwnerSchema.safeParse(req.body);
    if (!parsed.success) { validationError(res, parsed.error.errors); return; }
    const owner = await vos.updateVehicleOwner(req.params.id as string, parsed.data as never);
    if (!owner) { res.status(404).json({ success: false, statusCode: 404, message: "Owner not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Owner updated", data: owner });
};

export const deleteVehicleOwner = async (req: Request, res: Response): Promise<void> => {
    const ok = await vos.deleteVehicleOwner(req.params.id as string);
    if (!ok) { res.status(404).json({ success: false, statusCode: 404, message: "Owner not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Owner deleted" });
};
