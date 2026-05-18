import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import ListingForm from "@/components/admin/listings/ListingForm";

export default function NewListingPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/admin/listings"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="h-4 w-4" /> Back to listings
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Listing</h1>
        <p className="text-sm text-gray-500">
          Set status to Active when you're ready to publish to the site.
        </p>
      </div>
      <ListingForm />
    </div>
  );
}
