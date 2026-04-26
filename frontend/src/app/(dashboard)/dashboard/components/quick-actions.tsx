"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowDownLeft, ArrowUpRight, Bike, Car } from "lucide-react";

const QuickActions = () => {
    return (
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3">
            <Button asChild className="bg-gradient-brand text-white shadow-md hover:opacity-90 cursor-pointer">
                <Link href="/vehicles/new">
                    <Bike size={16} className="mr-2" /> Add 2W
                </Link>
            </Button>
            <Button asChild className="bg-gradient-brand text-white shadow-md hover:opacity-90 cursor-pointer">
                <Link href="/vehicles/new">
                    <Car size={16} className="mr-2" /> Add 4W
                </Link>
            </Button>
            <Button asChild variant="outline" className="cursor-pointer border-border hover:bg-muted">
                <Link href="/investments/new">
                    <ArrowDownLeft size={16} className="mr-2" /> Record Investment
                </Link>
            </Button>
            <Button asChild variant="outline" className="cursor-pointer border-border hover:bg-muted">
                <Link href="/repayments/new">
                    <ArrowUpRight size={16} className="mr-2" /> Record Repayment
                </Link>
            </Button>
        </div>
    );
};

export default QuickActions;
