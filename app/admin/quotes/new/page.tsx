import { EstimateWizard } from "@/components/admin/quotes/EstimateWizard";

export default function NewQuotePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Quote</h1>
        <p className="text-sm text-gray-500 mt-1">
          Create a new construction estimate
        </p>
      </div>
      <EstimateWizard />
    </div>
  );
}
