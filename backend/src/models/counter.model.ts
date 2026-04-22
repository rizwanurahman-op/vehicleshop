import mongoose, { Schema, Document } from "mongoose";

export interface ICounter extends Document {
    name: string;
    seq: number;
    prefix: string;
    padding: number;
}

const counterSchema = new Schema<ICounter>({
    name: { type: String, required: true, unique: true },
    seq: { type: Number, default: 0 },
    prefix: { type: String, required: true },
    padding: { type: Number, required: true },
});

export const Counter = mongoose.model<ICounter>("Counter", counterSchema);
