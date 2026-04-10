import { PageHeader } from "@/components/PageHeader";
import { SectionCard } from "@/components/SectionCard";
import { StatusBadge } from "@/components/StatusBadge";

export default function OrdersPage() {
  return (
    <div className="space-y-4 p-4">
      <PageHeader
        title="Order Entry"
        subtitle="Created from approved Quote"
      />

      <SectionCard title="Inherited Context">
        <div className="space-y-2 text-sm">
          <p><strong>Buyer:</strong> Acme Imports</p>
          <p><strong>Market:</strong> UAE</p>
          <p><strong>Products:</strong> Mango Chips, Banana Chips</p>
          <p><strong>Pricing:</strong> From Quote snapshot</p>
        </div>
      </SectionCard>

      <SectionCard title="Document Pack">
        <div className="space-y-2">
          <StatusBadge status="pending">Invoice</StatusBadge>
          <StatusBadge status="pending">Packing List</StatusBadge>
          <StatusBadge status="pending">Shipping Docs</StatusBadge>
        </div>
      </SectionCard>

      <SectionCard title="Execution Readiness">
        <div className="space-y-2 text-sm">
          <p>✔ Commercially Valid</p>
          <p>⚠ Documents Pending</p>
          <p>⚠ Dispatch Not Ready</p>
        </div>
      </SectionCard>
    </div>
  );
}
