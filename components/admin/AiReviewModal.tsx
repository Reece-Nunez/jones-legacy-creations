"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type {
  ExtractedDocumentData,
  DocumentAnalysisType,
} from "@/lib/extract-document";

interface AiReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reviewedData: ExtractedDocumentData) => void;
  data: ExtractedDocumentData;
  fileName: string;
  filePreviewUrl?: string | null;
  isLoading?: boolean;
}

const CATEGORY_OPTIONS = [
  { value: "", label: "Select category" },
  { value: "Plans", label: "Plans" },
  { value: "Engineering", label: "Engineering" },
  { value: "Permitting", label: "Permitting" },
  { value: "Slab", label: "Slab" },
  { value: "Plumbing", label: "Plumbing" },
  { value: "Lumber", label: "Lumber" },
  { value: "Framing", label: "Framing" },
  { value: "Trusses", label: "Trusses" },
  { value: "HVAC", label: "HVAC" },
  { value: "Electrical", label: "Electrical" },
  { value: "Windows", label: "Windows" },
  { value: "Roofing", label: "Roofing" },
  { value: "Drywall", label: "Drywall" },
  { value: "Painting", label: "Painting" },
  { value: "Flooring", label: "Flooring" },
  { value: "Cabinets", label: "Cabinets" },
  { value: "Countertops", label: "Countertops" },
  { value: "Appliances", label: "Appliances" },
  { value: "Landscaping", label: "Landscaping" },
  { value: "Concrete", label: "Concrete" },
  { value: "Insulation", label: "Insulation" },
  { value: "Fencing", label: "Fencing" },
  { value: "General", label: "General" },
];

const DOCUMENT_TYPE_OPTIONS: { value: DocumentAnalysisType; label: string }[] =
  [
    { value: "receipt", label: "Receipt" },
    { value: "invoice", label: "Invoice" },
    { value: "material_list", label: "Material List" },
    { value: "inspection", label: "Inspection" },
    { value: "general", label: "General" },
  ];

const CONFIDENCE_STYLES = {
  high: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-red-100 text-red-700",
};

export function AiReviewModal({
  isOpen,
  onClose,
  onConfirm,
  data,
  fileName,
  filePreviewUrl,
  isLoading,
}: AiReviewModalProps) {
  const [editedData, setEditedData] = useState<ExtractedDocumentData>(data);

  // Re-initialize when data changes (new extraction)
  useEffect(() => {
    setEditedData(data);
  }, [data]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const updateField = useCallback(
    <K extends keyof ExtractedDocumentData>(
      field: K,
      value: ExtractedDocumentData[K]
    ) => {
      setEditedData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const updateLineItem = useCallback(
    (
      index: number,
      field: keyof ExtractedDocumentData["line_items"][number],
      value: string | number | null
    ) => {
      setEditedData((prev) => {
        const items = [...prev.line_items];
        items[index] = { ...items[index], [field]: value };
        return { ...prev, line_items: items };
      });
    },
    []
  );

  const removeLineItem = useCallback((index: number) => {
    setEditedData((prev) => ({
      ...prev,
      line_items: prev.line_items.filter((_, i) => i !== index),
    }));
  }, []);

  const handleConfirm = () => {
    onConfirm(editedData);
  };

  if (!isOpen) return null;

  const isFinancialDoc =
    editedData.document_type === "receipt" ||
    editedData.document_type === "invoice";

  const isImagePreview =
    filePreviewUrl &&
    /\.(jpg|jpeg|png|gif|webp|bmp)/i.test(filePreviewUrl.split("?")[0] || "");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-sm sm:max-w-lg w-full mx-2 sm:mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-200 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold text-gray-900">
                Review AI Results
              </h2>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${CONFIDENCE_STYLES[editedData.confidence]}`}
              >
                {editedData.confidence} confidence
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                {editedData.document_type.replace("_", " ")}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1 truncate">{fileName}</p>
          </div>

          {/* Thumbnail */}
          {isImagePreview && (
            <div className="shrink-0 ml-3 mr-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={filePreviewUrl}
                alt="Document preview"
                className="w-[60px] h-[60px] md:w-[120px] md:h-[120px] object-cover rounded-lg border border-gray-200"
              />
            </div>
          )}

          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Info Banner */}
          <div className="flex items-start gap-2.5 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800">
              AI extracted the following information. Please review and correct
              any errors before saving.
            </p>
          </div>

          {/* Document Type */}
          <Select
            label="Document Type"
            value={editedData.document_type}
            onChange={(e) =>
              updateField(
                "document_type",
                e.target.value as DocumentAnalysisType
              )
            }
            options={DOCUMENT_TYPE_OPTIONS}
          />

          {/* Vendor Name */}
          <Input
            label="Vendor Name"
            value={
              editedData.vendor_name || editedData.vendor_company || ""
            }
            onChange={(e) => {
              updateField("vendor_name", e.target.value || null);
              updateField("vendor_company", e.target.value || null);
            }}
            placeholder="e.g. Home Depot"
          />

          {/* Amount */}
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-base">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editedData.amount ?? ""}
                onChange={(e) =>
                  updateField(
                    "amount",
                    e.target.value ? parseFloat(e.target.value) : null
                  )
                }
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-3 text-base text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 focus:border-transparent transition-all placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Date */}
          <Input
            label="Date"
            type="date"
            value={editedData.date || ""}
            onChange={(e) =>
              updateField("date", e.target.value || null)
            }
          />

          {/* Description */}
          <Input
            label="Description"
            value={editedData.description || ""}
            onChange={(e) =>
              updateField("description", e.target.value || null)
            }
            placeholder="Brief description of the document"
          />

          {/* Category */}
          <Select
            label="Category"
            value={editedData.category || ""}
            onChange={(e) =>
              updateField("category", e.target.value || null)
            }
            options={CATEGORY_OPTIONS}
          />

          {/* Payment Method (financial docs only) */}
          {isFinancialDoc && (
            <Input
              label="Payment Method"
              value={editedData.payment_method || ""}
              onChange={(e) =>
                updateField("payment_method", e.target.value || null)
              }
              placeholder="e.g. Credit Card, Cash, Check"
            />
          )}

          {/* Tax Amount (financial docs only) */}
          {isFinancialDoc && (
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tax Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-base">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editedData.tax_amount ?? ""}
                  onChange={(e) =>
                    updateField(
                      "tax_amount",
                      e.target.value ? parseFloat(e.target.value) : null
                    )
                  }
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 text-base text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 focus:border-transparent transition-all placeholder:text-gray-400"
                />
              </div>
            </div>
          )}

          {/* Line Items */}
          {editedData.line_items.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Line Items
              </label>
              <div className="overflow-x-auto -mx-2 px-2">
                <div className="min-w-[400px]">
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-[1fr_60px_80px_80px_32px] gap-1 px-2 py-1.5 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <span>Description</span>
                  <span>Qty</span>
                  <span>Price</span>
                  <span>Total</span>
                  <span></span>
                </div>
                {/* Table Rows */}
                {editedData.line_items.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[1fr_60px_80px_80px_32px] gap-1 px-2 py-1 border-t border-gray-100 items-center"
                  >
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) =>
                        updateLineItem(index, "description", e.target.value)
                      }
                      className="w-full px-1.5 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-black"
                    />
                    <input
                      type="number"
                      value={item.quantity ?? ""}
                      onChange={(e) =>
                        updateLineItem(
                          index,
                          "quantity",
                          e.target.value ? parseFloat(e.target.value) : null
                        )
                      }
                      className="w-full px-1.5 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-black"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={item.unit_price ?? ""}
                      onChange={(e) =>
                        updateLineItem(
                          index,
                          "unit_price",
                          e.target.value ? parseFloat(e.target.value) : null
                        )
                      }
                      className="w-full px-1.5 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-black"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={item.total ?? ""}
                      onChange={(e) =>
                        updateLineItem(
                          index,
                          "total",
                          e.target.value ? parseFloat(e.target.value) : null
                        )
                      }
                      className="w-full px-1.5 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-black"
                    />
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      aria-label={`Remove line item ${index + 1}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row gap-3 p-5 border-t border-gray-200 shrink-0">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto sm:flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            isLoading={isLoading}
            className="w-full sm:w-auto sm:flex-1"
          >
            Confirm &amp; Save
          </Button>
        </div>
      </div>
    </div>
  );
}
