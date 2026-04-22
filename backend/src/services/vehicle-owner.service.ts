import mongoose from "mongoose";
import { VehicleOwner, IVehicleOwner } from "../models/vehicle-owner.model";
import { getNextId } from "./counter.service";

export const createVehicleOwner = async (data: Partial<IVehicleOwner>): Promise<IVehicleOwner> => {
    const ownerId = await getNextId("vehicleOwner");
    const owner = new VehicleOwner({ ...data, ownerId });
    await owner.save();
    return owner;
};

export const getVehicleOwners = async (query: { search?: string; page?: number; limit?: number }) => {
    const { search, page = 1, limit = 50 } = query;
    const filter: Record<string, unknown> = { isActive: true };
    if (search) filter.$text = { $search: search };

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
        VehicleOwner.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
        VehicleOwner.countDocuments(filter),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const getVehicleOwnerById = async (id: string) => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return VehicleOwner.findOne({ _id: id, isActive: true });
};

export const getVehicleOwnerWithSummary = async (id: string) => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const owner = await VehicleOwner.findOne({ _id: id, isActive: true }).lean();
    if (!owner) return null;

    const { ConsignmentVehicle } = await import("../models/consignment-vehicle.model");
    const vehicles = await ConsignmentVehicle.find({ ownerId: new mongoose.Types.ObjectId(id), isActive: true })
        .select("consignmentId make model registrationNo dateReceived dateSold soldPrice status paidToPayee totalReconCost")
        .sort({ dateReceived: -1 })
        .lean();

    const totalVehiclesParked = vehicles.length;
    const totalVehiclesSold = vehicles.filter(v => v.dateSold).length;
    const currentlyParked = vehicles.filter(v => !v.dateSold && v.status !== "returned").length;
    const totalPaid = vehicles.reduce((s, v) => s + (v.paidToPayee || 0), 0);
    const totalPending = vehicles
        .filter(v => v.dateSold)
        .reduce((s, v) => s + Math.max(0, ((v.soldPrice || 0) - (v.totalReconCost || 0)) - (v.paidToPayee || 0)), 0);

    return { ...owner, totalVehiclesParked, totalVehiclesSold, currentlyParked, totalPaid, totalPending, vehicles };
};

export const updateVehicleOwner = async (id: string, data: Partial<IVehicleOwner>): Promise<IVehicleOwner | null> => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return VehicleOwner.findOneAndUpdate({ _id: id, isActive: true }, { $set: data }, { new: true, runValidators: true });
};

export const deleteVehicleOwner = async (id: string): Promise<boolean> => {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    const result = await VehicleOwner.findOneAndUpdate({ _id: id, isActive: true }, { $set: { isActive: false } });
    return !!result;
};
