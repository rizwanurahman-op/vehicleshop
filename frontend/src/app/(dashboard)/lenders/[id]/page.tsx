import { Metadata } from "next";
import { APP_NAME } from "@data";
import { LenderDetail } from "./components";
import { serverFetch } from "@/lib/serverFetch";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const { data } = await serverFetch<ILenderWithSummary>(`/lenders/${id}`);
    const name = data?.name ?? "Lender";
    return {
        title: `${APP_NAME} | ${name}`,
        description: `Capital and repayment details for ${name}`,
    };
}

const LenderDetailPage = async ({ params }: Props) => {
    const { id } = await params;
    const { data: initialData } = await serverFetch<ILenderWithSummary>(`/lenders/${id}`);
    return (
        <section className="flex w-full flex-col pb-20 md:pb-4">
            <LenderDetail id={id} initialData={initialData} />
        </section>
    );
};

export default LenderDetailPage;
