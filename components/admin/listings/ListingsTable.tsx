"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { Pencil, Trash2, ExternalLink, Plus, Home, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrencyWhole } from "@/lib/formatters";
import { confirmAction } from "@/lib/confirmAction";
import {
  LISTING_STATUS_COLORS,
  LISTING_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  type RealEstateListing,
} from "@/lib/types/real-estate";

interface Props {
  listings: RealEstateListing[];
}

export default function ListingsTable({ listings }: Props) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  async function handleDuplicate(listing: RealEstateListing) {
    setDuplicatingId(listing.id);
    try {
      // Strip server-managed fields; flip status to draft so the copy is
      // private until reviewed; tag the address so it's easy to find.
      const payload = {
        address: `${listing.address} (copy)`,
        city: listing.city,
        state: listing.state,
        zip: listing.zip,
        price: listing.price,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        square_footage: listing.square_footage,
        lot_size: listing.lot_size,
        property_type: listing.property_type,
        mls_url: listing.mls_url,
        cover_photo_url: listing.cover_photo_url,
        description: listing.description,
        status: "draft",
        sort_order: listing.sort_order,
        featured: false,
      };
      const res = await fetch("/api/admin/real-estate-listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to duplicate listing");
      }
      const created = await res.json();
      toast.success("Listing duplicated as draft");
      router.push(`/admin/listings/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to duplicate listing");
    } finally {
      setDuplicatingId(null);
    }
  }

  async function handleDelete(listing: RealEstateListing) {
    if (
      !(await confirmAction(
        `Delete listing at ${listing.address}? This cannot be undone.`
      ))
    )
      return;
    setDeletingId(listing.id);
    try {
      const res = await fetch(`/api/admin/real-estate-listings/${listing.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to delete listing");
      }
      toast.success("Listing deleted");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete listing");
    } finally {
      setDeletingId(null);
    }
  }

  if (listings.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
        <Home className="mx-auto h-10 w-10 text-gray-300" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">No listings yet</h3>
        <p className="mt-2 text-sm text-gray-500">
          Add your first listing to feature it on the real estate page.
        </p>
        <Link
          href="/admin/listings/new"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          Add Listing
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {listings.map((l) => (
        <div
          key={l.id}
          className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
        >
          <Link
            href={`/admin/listings/${l.id}`}
            className="flex flex-col sm:flex-row group"
            aria-label={`Edit listing at ${l.address}`}
          >
            {/* Cover photo */}
            <div className="sm:w-48 sm:shrink-0 aspect-[4/3] sm:aspect-auto relative bg-gray-100">
              {l.cover_photo_url ? (
                <Image
                  src={l.cover_photo_url}
                  alt={l.address}
                  fill
                  sizes="(max-width: 640px) 100vw, 192px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Home className="h-10 w-10 text-gray-300" />
                </div>
              )}
            </div>

            {/* Body */}
            <div className="flex-1 p-4 sm:p-5 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">
                    {l.address}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {l.city}, {l.state} {l.zip ?? ""}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
                    LISTING_STATUS_COLORS[l.status]
                  )}
                >
                  {LISTING_STATUS_LABELS[l.status]}
                  {l.featured && " ★"}
                </span>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                {l.price !== null && (
                  <span className="font-semibold text-gray-900">
                    {formatCurrencyWhole(l.price)}
                  </span>
                )}
                {l.bedrooms !== null && <span>{l.bedrooms} bed</span>}
                {l.bathrooms !== null && <span>{l.bathrooms} bath</span>}
                {l.square_footage !== null && (
                  <span>{l.square_footage.toLocaleString()} sf</span>
                )}
                {l.property_type && (
                  <span className="text-gray-500">
                    · {PROPERTY_TYPE_LABELS[l.property_type]}
                  </span>
                )}
              </div>
            </div>
          </Link>

          {/* Action row — outside the Link so the buttons don't trigger navigation */}
          <div className="flex items-center gap-2 px-4 sm:px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex-wrap">
            {l.mls_url && (
              <a
                href={l.mls_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 mr-auto"
              >
                MLS listing <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <Link
              href={`/admin/listings/${l.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 min-h-[40px] text-sm font-medium text-indigo-700 hover:bg-indigo-50"
            >
              <Pencil className="h-4 w-4" /> Edit
            </Link>
            <button
              onClick={() => handleDuplicate(l)}
              disabled={duplicatingId === l.id}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 min-h-[40px] text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              title="Make a copy as a draft"
            >
              <Copy className="h-4 w-4" /> Duplicate
            </button>
            <button
              onClick={() => handleDelete(l)}
              disabled={deletingId === l.id}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 min-h-[40px] text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
