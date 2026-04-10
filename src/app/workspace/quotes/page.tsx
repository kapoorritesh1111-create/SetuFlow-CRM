import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { SectionCard } from "@/components/SectionCard";

export default function QuotesPage() {
  return (
    <div className="space-y-4 p-4">
      <PageHeader
        title="Quote Entry"
        subtitle="Prepare and review before conversion"
      />

      <SectionCard title="Quote Details">
        <div className="text-sm space-y-2">
          <p><strong>Buyer:</strong> Acme Imports</p>
          <p><strong>Market:</strong> UAE</p>
          <p><strong>Products:</strong> Mango Chips, Banana Chips</p>
        </div>
      </SectionCard>

      <SectionCard title="Approval Status">
        <p className="text-sm">⚠ Pending Approval</p>
      </SectionCard>

      <div className="pt-4">
        <Link href="/workspace/orders">
          <button className="bg-black text-white px-4 py-2 rounded">
            Convert to Order
          </button>
        </Link>
      </div>
    </div>
  );
}
