"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { Contractor, ContractorPayment } from "@/lib/types/database";
import { confirmAction } from "@/lib/confirmAction";
import {
  formatCurrency as fmt,
  formatCurrencyInput,
  unformatCurrency,
} from "@/lib/formatters";

/**
 * Creating, editing and settling contractor payments.
 *
 * PaymentsTab and DrawsTab each carried their own copy of this — twelve
 * functions, byte-identical apart from local variable names, with the Draws
 * copy marked "merged from PaymentsTab". They had not drifted yet, which is
 * the point of extracting them now rather than after they do: a fix applied to
 * one and not the other would show up as the two tabs disagreeing about the
 * same payment.
 *
 * State lives here; each tab renders its own UI around it.
 */

const EMPTY_ADD_FORM = {
  contractor_id: "",
  contractor_name: "",
  description: "",
  amount: "",
  due_date: "",
};

const EMPTY_EDIT_FORM = {
  contractor_name: "",
  description: "",
  amount: "",
  status: "pending" as string,
  due_date: "",
  budget_line_number: "",
};

export type PaymentMutate = (
  url: string,
  method: string,
  body?: Record<string, unknown> | FormData,
) => Promise<Response | undefined>;

export function usePaymentActions({
  projectId,
  contractors,
  mutate,
}: {
  projectId: string;
  contractors: Contractor[];
  mutate: PaymentMutate;
}) {
  const router = useRouter();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_ADD_FORM);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [editingPayment, setEditingPayment] = useState<string | null>(null);
  const [editPaymentForm, setEditPaymentForm] = useState(EMPTY_EDIT_FORM);
  // Payment queued for the QuickBooks pay-contractor modal.
  const [payModalPayment, setPayModalPayment] = useState<{
    id: string;
    contractor_name: string;
    amount: number;
  } | null>(null);

  /** "other" means a one-off vendor with no contractor record, so the name is typed. */
  function handleContractorChange(value: string) {
    if (value === "other") {
      setForm((f) => ({ ...f, contractor_id: "other", contractor_name: "" }));
    } else if (value === "") {
      setForm((f) => ({ ...f, contractor_id: "", contractor_name: "" }));
    } else {
      const contractor = contractors.find((c) => c.id === value);
      setForm((f) => ({
        ...f,
        contractor_id: value,
        contractor_name: contractor?.name ?? "",
      }));
    }
  }

  async function addPayment() {
    if (!form.contractor_name || !form.amount) return;

    const fd = new FormData();
    fd.append("contractor_id", form.contractor_id);
    fd.append("contractor_name", form.contractor_name);
    fd.append("description", form.description);
    fd.append("amount", unformatCurrency(form.amount));
    fd.append("due_date", form.due_date);
    if (invoiceFile) fd.append("invoice_file", invoiceFile);

    await mutate(`/api/admin/projects/${projectId}/payments`, "POST", fd);
    setForm(EMPTY_ADD_FORM);
    setInvoiceFile(null);
    setShowForm(false);
  }

  function startEditPayment(p: ContractorPayment) {
    setEditingPayment(p.id);
    setEditPaymentForm({
      contractor_name: p.contractor_name,
      description: p.description || "",
      amount: formatCurrencyInput(String(p.amount)),
      status: p.status,
      due_date: p.due_date ?? "",
      budget_line_number: p.budget_line_number ?? "",
    });
  }

  async function saveEditPayment(id: string) {
    await mutate(`/api/admin/projects/${projectId}/payments/${id}`, "PATCH", {
      contractor_name: editPaymentForm.contractor_name,
      description: editPaymentForm.description || null,
      amount: parseFloat(unformatCurrency(editPaymentForm.amount)),
      status: editPaymentForm.status,
      due_date: editPaymentForm.due_date || null,
      budget_line_number: editPaymentForm.budget_line_number || null,
    });
    setEditingPayment(null);
  }

  /** Blake paid this out of pocket; a later draw may reimburse it. */
  async function markAsPaid(p: ContractorPayment) {
    await mutate(`/api/admin/projects/${projectId}/payments/${p.id}`, "PATCH", {
      status: "paid_personal",
      paid_date: new Date().toISOString().split("T")[0],
    });
  }

  /** Paid directly from lender funds rather than out of pocket. */
  async function markPaidFromDraw(p: ContractorPayment) {
    await mutate(`/api/admin/projects/${projectId}/payments/${p.id}`, "PATCH", {
      status: "paid_from_draw",
      paid_from_draw_date: new Date().toISOString().split("T")[0],
    });
  }

  async function uploadReceipt(paymentId: string, file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(
      `/api/admin/projects/${projectId}/payments/${paymentId}/receipt`,
      { method: "POST", body: fd },
    );
    if (!res.ok) {
      toast.error("Failed to upload receipt");
      return;
    }
    const result = await res.json();
    // A receipt that disagrees with the invoice is worth surfacing rather than
    // silently accepting — it usually means a partial payment or a wrong file.
    if (result.amount_mismatch) {
      toast(
        `Receipt amount (${fmt(result.ai_extracted?.amount)}) doesn't match invoice — please verify.`,
        { icon: "⚠️", duration: 8000 },
      );
    } else {
      toast.success("Receipt uploaded");
    }
    router.refresh();
  }

  async function deletePayment(id: string) {
    if (!(await confirmAction("Delete this payment?"))) return;
    await mutate(`/api/admin/projects/${projectId}/payments/${id}`, "DELETE");
  }

  return {
    showForm, setShowForm,
    form, setForm,
    invoiceFile, setInvoiceFile,
    editingPayment, setEditingPayment,
    editPaymentForm, setEditPaymentForm,
    payModalPayment, setPayModalPayment,
    handleContractorChange,
    addPayment,
    startEditPayment,
    saveEditPayment,
    markAsPaid,
    markPaidFromDraw,
    uploadReceipt,
    deletePayment,
  };
}
