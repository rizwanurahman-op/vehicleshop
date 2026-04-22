import { Counter } from "../models/counter.model";

interface CounterConfig {
    name: string;
    prefix: string;
    padding: number;
}

const COUNTER_CONFIGS: CounterConfig[] = [
    { name: "lender", prefix: "L", padding: 3 },
    { name: "investment", prefix: "INV-", padding: 5 },
    { name: "repayment", prefix: "REP-", padding: 5 },
    { name: "vehicle", prefix: "VH-", padding: 5 },
    { name: "consignment", prefix: "CS-", padding: 5 },
    { name: "vehicleOwner", prefix: "OWN-", padding: 3 },
];

export const initializeCounters = async (): Promise<void> => {
    for (const config of COUNTER_CONFIGS) {
        await Counter.findOneAndUpdate(
            { name: config.name },
            { $setOnInsert: { name: config.name, seq: 0, prefix: config.prefix, padding: config.padding } },
            { upsert: true, new: true }
        );
    }
    console.log("✅ Counters initialized");
};

export const getNextId = async (name: string): Promise<string> => {
    // Find the config so we can upsert if missing (e.g. after a DB clear)
    const config = COUNTER_CONFIGS.find((c) => c.name === name);
    if (!config) throw new Error(`Counter config for "${name}" not defined`);

    const counter = await Counter.findOneAndUpdate(
        { name },
        {
            $inc: { seq: 1 },
            $setOnInsert: { prefix: config.prefix, padding: config.padding },
        },
        { upsert: true, new: true }
    );

    const paddedSeq = String(counter!.seq).padStart(counter!.padding, "0");
    return `${counter!.prefix}${paddedSeq}`;
};

const counterService = { initializeCounters, getNextId };
export default counterService;
