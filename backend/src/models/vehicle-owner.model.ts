import mongoose, { Schema, Document, model } from "mongoose";

export interface IVehicleOwner extends Document {
    ownerId: string;
    name: string;
    phone?: string;
    address?: string;
    remarks?: string;
    isActive: boolean;
}

const VehicleOwnerSchema = new Schema<IVehicleOwner>({
    ownerId: { type: String, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    remarks: String,
    isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

VehicleOwnerSchema.index({ name: 1 });
VehicleOwnerSchema.index({ phone: 1 });

export const VehicleOwner = model<IVehicleOwner>("VehicleOwner", VehicleOwnerSchema);
