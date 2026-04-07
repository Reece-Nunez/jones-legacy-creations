"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload, CheckCircle, AlertCircle, FileText, X } from "lucide-react";
import { formatCurrencyInput, unformatCurrency } from "@/lib/formatters";

interface ContractorInvoiceUploadProps {
  token: string;
  projectName: string;
  contractorName: string;
  hasW9: boolean;
}

export function ContractorInvoiceUpload({
  token,
  projectName,
  contractorName,
  hasW9,
}: ContractorInvoiceUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [w9File, setW9File] = useState<File | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const w9InputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setError(null);
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeW9 = () => {
    setW9File(null);
    if (w9InputRef.current) w9InputRef.current.value = "";
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(formatCurrencyInput(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("Please select a file to upload.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("token", token);
      formData.append("file", file);
      if (amount) {
        formData.append("amount", unformatCurrency(amount));
      }
      if (description.trim()) {
        formData.append("description", description.trim());
      }
      if (referenceNumber.trim()) {
        formData.append("reference_number", referenceNumber.trim());
      }
      if (w9File) {
        formData.append("w9_file", w9File);
      }

      const res = await fetch("/api/submit-invoice", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit invoice.");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Invoice submitted!
          </h2>
          <p className="text-gray-500">
            Blake will review it shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-8 pb-6 text-center border-b border-gray-100">
          <Image
            src="/logo-transparent.png"
            alt="Jones Legacy Creations"
            width={80}
            height={80}
            className="mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Submit Invoice
          </h1>
          <p className="text-sm text-gray-500">
            For: <span className="font-medium text-gray-700">{projectName}</span>
          </p>
          <p className="text-sm text-gray-500">
            From: <span className="font-medium text-gray-700">{contractorName}</span>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invoice file <span className="text-red-500">*</span>
            </label>
            {!file ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl py-8 px-4 flex flex-col items-center justify-center gap-2 hover:border-gray-400 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <Upload className="w-8 h-8 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">
                  Tap to upload or take a photo
                </span>
                <span className="text-xs text-gray-400">
                  PDF, images, or Word documents
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <span className="text-sm text-gray-700 truncate flex-1">
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={removeFile}
                  className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              accept="image/*,.pdf,.doc,.docx"
              capture="environment"
              className="hidden"
            />
          </div>

          {/* Invoice Amount */}
          <div>
            <label
              htmlFor="amount"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Invoice amount
            </label>
            <input
              id="amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={handleAmountChange}
              placeholder="$0.00"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Description
            </label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Plumbing rough-in for kitchen"
              maxLength={200}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
            />
          </div>

          {/* Reference Number */}
          <div>
            <label
              htmlFor="referenceNumber"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Invoice / reference number
            </label>
            <input
              id="referenceNumber"
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. INV-001"
              maxLength={50}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
            />
          </div>

          {/* W9 Upload — only shown if no W9 on file */}
          {!hasW9 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                W9 form
              </label>
              <p className="text-xs text-gray-400 mb-2">
                We don&apos;t have your W9 on file. Please upload one with your invoice.
              </p>
              {!w9File ? (
                <button
                  type="button"
                  onClick={() => w9InputRef.current?.click()}
                  className="w-full border-2 border-dashed border-amber-300 rounded-xl py-5 px-4 flex flex-col items-center justify-center gap-2 hover:border-amber-400 hover:bg-amber-50 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <Upload className="w-6 h-6 text-amber-400" />
                  <span className="text-sm font-medium text-gray-600">Tap to upload W9</span>
                  <span className="text-xs text-gray-400">PDF or image</span>
                </button>
              ) : (
                <div className="flex items-center gap-3 bg-amber-50 rounded-xl px-4 py-3">
                  <FileText className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700 truncate flex-1">{w9File.name}</span>
                  <button type="button" onClick={removeW9} className="p-1 hover:bg-amber-100 rounded-full transition-colors">
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              )}
              <input
                ref={w9InputRef}
                type="file"
                onChange={(e) => setW9File(e.target.files?.[0] ?? null)}
                accept="image/*,.pdf"
                className="hidden"
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || !file}
            className="w-full bg-black text-white font-semibold py-4 rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Uploading...
              </span>
            ) : (
              "Submit Invoice"
            )}
          </button>

          {/* Trust signal */}
          <p className="text-xs text-gray-400 text-center pt-1">
            Secure upload — your file goes directly to Jones Legacy Creations
          </p>
        </form>
      </div>
    </div>
  );
}
