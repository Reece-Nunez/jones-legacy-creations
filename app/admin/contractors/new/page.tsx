import ContractorForm from "@/components/admin/ContractorForm";

export default function NewContractorPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">
          Add Contractor
        </h1>
        <ContractorForm />
      </div>
    </div>
  );
}
