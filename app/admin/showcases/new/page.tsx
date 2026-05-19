import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import ShowcaseForm from "@/components/admin/showcases/ShowcaseForm";

export default function NewShowcasePage() {
  return (
    <div className="space-y-6">
      <Link
        href="/admin/showcases"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="h-4 w-4" /> Back to showcases
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Showcase Project</h1>
        <p className="text-sm text-gray-500">
          Save first to upload photos. Flip status to Active when you&apos;re
          ready to publish.
        </p>
      </div>
      <ShowcaseForm />
    </div>
  );
}
