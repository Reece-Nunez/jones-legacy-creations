/**
 * QuickBooks Online API client
 * Wraps QBO REST API calls with auto-token-refresh.
 */

import { getValidAccessToken, QBO_BASE_URL } from "./auth";

// QBO API minor version — update here when Intuit releases a new required version.
// v65 was deprecated August 1 2025; v75 is the current minimum required version.
const MV = "minorversion=75";

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function qboFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const { accessToken, realmId } = await getValidAccessToken();

  const url = `${QBO_BASE_URL}/v3/company/${realmId}/${path}`;

  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
}

/**
 * Extracts intuit_tid from a QBO response header and throws a standardised
 * error that includes it. Intuit support uses intuit_tid to look up the
 * exact server-side request for troubleshooting.
 */
function qboError(res: Response, body: string, context: string): Error {
  const tid = res.headers.get("intuit_tid") ?? "unknown";
  console.error(`[QBO] ${context} failed | status: ${res.status} | intuit_tid: ${tid} | body: ${body}`);
  return new Error(`${context} failed (intuit_tid: ${tid}): ${body}`);
}

async function qboQuery(query: string) {
  const { accessToken, realmId } = await getValidAccessToken();
  const encoded = encodeURIComponent(query);
  const url = `${QBO_BASE_URL}/v3/company/${realmId}/query?query=${encoded}&${MV}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw qboError(res, err, "QBO query");
  }

  return res.json();
}

// ─── Customers ────────────────────────────────────────────────────────────────

export interface QBOCustomerInput {
  displayName: string;
  email?: string | null;
  phone?: string | null;
}

/** Find an existing QBO Customer by DisplayName to avoid duplicates. */
async function findCustomerByName(
  displayName: string
): Promise<{ Id: string; SyncToken: string } | null> {
  try {
    const safe = displayName.replace(/'/g, "\\'");
    const result = await qboQuery(
      `SELECT Id, SyncToken FROM Customer WHERE DisplayName = '${safe}' AND Active = true`
    );
    const rows: Array<{ Id: string; SyncToken: string }> =
      result?.QueryResponse?.Customer ?? [];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function createOrUpdateCustomer(
  input: QBOCustomerInput,
  existingQboId?: string
): Promise<{ Id: string; DisplayName: string }> {
  const body: Record<string, unknown> = {
    DisplayName: input.displayName,
    ...(input.email ? { PrimaryEmailAddr: { Address: input.email } } : {}),
    ...(input.phone ? { PrimaryPhone: { FreeFormNumber: input.phone } } : {}),
  };

  // Resolve the QBO ID — use the provided ID, look up by name, or create new
  let resolvedId = existingQboId;
  if (!resolvedId) {
    const found = await findCustomerByName(input.displayName);
    if (found) resolvedId = found.Id;
  }

  if (resolvedId) {
    const existing = await qboFetch(`customer/${resolvedId}?${MV}`);
    const { Customer } = await existing.json();
    body.Id = resolvedId;
    body.SyncToken = Customer.SyncToken;
    body.sparse = true;
  }

  const res = await qboFetch(`customer?${MV}`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw qboError(res, err, "QBO customer upsert");
  }

  const json = await res.json();
  return json.Customer;
}

// ─── Vendors ─────────────────────────────────────────────────────────────────

export interface QBOVendorInput {
  displayName: string;
  email?: string | null;
  phone?: string | null;
  /** true = 1099 subcontractor (Workers > Contractors in QBO); false = regular material vendor */
  vendor1099?: boolean;
}

/** Find an existing QBO Vendor by DisplayName to avoid duplicates. */
async function findVendorByName(
  displayName: string
): Promise<{ Id: string; SyncToken: string } | null> {
  try {
    const safe = displayName.replace(/'/g, "\\'");
    const result = await qboQuery(
      `SELECT Id, SyncToken FROM Vendor WHERE DisplayName = '${safe}' AND Active = true`
    );
    const rows: Array<{ Id: string; SyncToken: string }> =
      result?.QueryResponse?.Vendor ?? [];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function createOrUpdateVendor(
  input: QBOVendorInput,
  existingQboId?: string
): Promise<{ Id: string; DisplayName: string }> {
  const body: Record<string, unknown> = {
    DisplayName: input.displayName,
    ...(input.email ? { PrimaryEmailAddr: { Address: input.email } } : {}),
    ...(input.phone ? { PrimaryPhone: { FreeFormNumber: input.phone } } : {}),
    // 1099 flag: true = subcontractor (appears under Workers > Contractors in QBO)
    Vendor1099: input.vendor1099 ?? false,
  };

  // Resolve the QBO ID — use the provided ID, look up by name, or create new
  let resolvedId = existingQboId;
  if (!resolvedId) {
    const found = await findVendorByName(input.displayName);
    if (found) resolvedId = found.Id;
  }

  if (resolvedId) {
    const existing = await qboFetch(`vendor/${resolvedId}?${MV}`);
    const { Vendor } = await existing.json();
    body.Id = resolvedId;
    body.SyncToken = Vendor.SyncToken;
    body.sparse = true;
  }

  const res = await qboFetch(`vendor?${MV}`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw qboError(res, err, "QBO vendor upsert");
  }

  const json = await res.json();
  return json.Vendor;
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export interface QBOInvoiceInput {
  customerQboId: string;
  invoiceNumber: string;
  amount: number;
  description: string;
  memo?: string;
  dueDate?: string | null;
}

export async function createInvoice(
  input: QBOInvoiceInput
): Promise<{ Id: string; DocNumber: string }> {
  const body: Record<string, unknown> = {
    DocNumber: input.invoiceNumber,
    CustomerRef: { value: input.customerQboId },
    DueDate: input.dueDate ?? undefined,
    ...(input.memo ? { CustomerMemo: { value: input.memo } } : {}),
    Line: [
      {
        Amount: input.amount,
        DetailType: "SalesItemLineDetail",
        Description: input.description,
        SalesItemLineDetail: {
          ItemRef: { value: "1", name: "Services" }, // default Services item
          UnitPrice: input.amount,
          Qty: 1,
        },
      },
    ],
  };

  const res = await qboFetch(`invoice?${MV}`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw qboError(res, err, "QBO invoice create");
  }

  const json = await res.json();
  return json.Invoice;
}

// ─── Account resolver ─────────────────────────────────────────────────────────

/**
 * Resolves an account name to a QBO AccountRef { value, name }.
 * Tries name first, then falls back to account type queries so bills
 * always get a valid account even when custom names don't exist.
 */
async function resolveAccountRef(
  accountName: string
): Promise<{ value: string; name: string } | { name: string }> {
  type AccountRow = { Id: string; Name: string };

  // 1. Exact name match
  try {
    const safe = accountName.replace(/'/g, "\\'");
    const r = await qboQuery(
      `SELECT Id, Name FROM Account WHERE Name = '${safe}' AND Active = true`
    );
    const rows: AccountRow[] = r?.QueryResponse?.Account ?? [];
    if (rows.length > 0) return { value: rows[0].Id, name: rows[0].Name };
  } catch { /* fall through */ }

  // 2. Any Cost of Goods Sold type account
  try {
    const r = await qboQuery(
      `SELECT Id, Name FROM Account WHERE AccountType = 'Cost of Goods Sold' AND Active = true`
    );
    const rows: AccountRow[] = r?.QueryResponse?.Account ?? [];
    if (rows.length > 0) return { value: rows[0].Id, name: rows[0].Name };
  } catch { /* fall through */ }

  // 3. Any Expense type account
  try {
    const r = await qboQuery(
      `SELECT Id, Name FROM Account WHERE AccountType = 'Expense' AND Active = true`
    );
    const rows: AccountRow[] = r?.QueryResponse?.Account ?? [];
    if (rows.length > 0) return { value: rows[0].Id, name: rows[0].Name };
  } catch { /* fall through */ }

  // Last resort: name only — QBO may auto-create or reject
  return { name: accountName };
}

// ─── Bills (contractor payables) ─────────────────────────────────────────────

export interface QBOBillInput {
  vendorQboId: string;
  amount: number;
  description: string;
  /** QBO expense account name — from AI categorization */
  account?: string;
  /** Short memo on the bill header */
  memo?: string;
  txnDate?: string | null;
  dueDate?: string | null;
  /**
   * Idempotency key — stored as QBO DocNumber.
   * QBO enforces uniqueness (error 6240 on duplicate), so on retry we
   * detect the duplicate and return the existing Bill Id instead of
   * creating a second one.
   */
  docNumber?: string;
}

export async function createBill(
  input: QBOBillInput
): Promise<{ Id: string }> {
  const accountName = input.account ?? "Cost of Goods Sold";
  const accountRef = await resolveAccountRef(accountName);
  const body: Record<string, unknown> = {
    VendorRef: { value: input.vendorQboId },
    TxnDate: input.txnDate ?? undefined,
    DueDate: input.dueDate ?? undefined,
    ...(input.docNumber ? { DocNumber: input.docNumber } : {}),
    ...(input.memo ? { PrivateNote: input.memo } : {}),
    Line: [
      {
        Amount: input.amount,
        DetailType: "AccountBasedExpenseLineDetail",
        Description: input.description,
        AccountBasedExpenseLineDetail: {
          AccountRef: accountRef,
        },
      },
    ],
  };

  const res = await qboFetch(`bill?${MV}`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    // QBO error 6240 = duplicate DocNumber — recover by querying for the existing bill
    if (input.docNumber) {
      try {
        const errJson = JSON.parse(errText);
        const errors: Array<{ code: string }> = errJson?.Fault?.Error ?? [];
        if (errors.some((e) => e.code === "6240")) {
          const safe = input.docNumber.replace(/'/g, "\\'");
          const found = await qboQuery(`SELECT Id FROM Bill WHERE DocNumber = '${safe}'`);
          const rows: Array<{ Id: string }> = found?.QueryResponse?.Bill ?? [];
          if (rows[0]) return { Id: rows[0].Id };
        }
      } catch { /* fall through */ }
    }
    throw qboError(res, errText, "QBO bill create");
  }

  const json = await res.json();
  return json.Bill;
}

// ─── Bill Payments ────────────────────────────────────────────────────────────

export interface QBOBillPaymentInput {
  vendorQboId: string;
  billQboId: string;
  amount: number;
  bankAccountQboId: string;
  /** Optional memo shown on the payment */
  memo?: string;
  txnDate?: string | null;
  /**
   * Idempotency key — stored as QBO DocNumber.
   * On duplicate (error 6240) we recover the existing BillPayment Id
   * instead of creating a second payment.
   */
  docNumber?: string;
}

export async function createBillPayment(
  input: QBOBillPaymentInput
): Promise<{ Id: string }> {
  const body: Record<string, unknown> = {
    VendorRef: { value: input.vendorQboId },
    PayType: "Check",
    TotalAmt: input.amount,
    TxnDate: input.txnDate ?? new Date().toISOString().split("T")[0],
    ...(input.docNumber ? { DocNumber: input.docNumber } : {}),
    ...(input.memo ? { PrivateNote: input.memo } : {}),
    CheckPayment: {
      BankAccountRef: { value: input.bankAccountQboId },
    },
    Line: [
      {
        Amount: input.amount,
        LinkedTxn: [
          {
            TxnId: input.billQboId,
            TxnType: "Bill",
          },
        ],
      },
    ],
  };

  const res = await qboFetch(`billpayment?${MV}`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    // QBO error 6240 = duplicate DocNumber — recover existing BillPayment instead of double-paying
    if (input.docNumber) {
      try {
        const errJson = JSON.parse(errText);
        const errors: Array<{ code: string }> = errJson?.Fault?.Error ?? [];
        if (errors.some((e) => e.code === "6240")) {
          const safe = input.docNumber.replace(/'/g, "\\'");
          const found = await qboQuery(`SELECT Id FROM BillPayment WHERE DocNumber = '${safe}'`);
          const rows: Array<{ Id: string }> = found?.QueryResponse?.BillPayment ?? [];
          if (rows[0]) return { Id: rows[0].Id };
        }
      } catch { /* fall through */ }
    }
    throw qboError(res, errText, "QBO bill payment");
  }

  const json = await res.json();
  return json.BillPayment;
}

// ─── Vendor bank details (direct deposit setup) ──────────────────────────────

export interface QBOBankDetails {
  routingNumber: string;
  accountNumber: string;
  accountHolderName: string;
  /** "checking" or "savings" */
  accountType: string;
}

export async function updateVendorBankDetails(
  vendorQboId: string,
  bankDetails: QBOBankDetails
): Promise<void> {
  // Fetch current vendor to get SyncToken (required for updates)
  const getRes = await qboFetch(`vendor/${vendorQboId}?${MV}`);
  if (!getRes.ok) {
    const err = await getRes.text();
    throw qboError(getRes, err, "QBO get vendor");
  }
  const { Vendor } = await getRes.json();

  const body = {
    Id: vendorQboId,
    SyncToken: Vendor.SyncToken,
    sparse: true,
    VendorPaymentBankDetail: {
      BankBranchIdentifier: bankDetails.routingNumber,
      BankAccountNumber: bankDetails.accountNumber,
      BankAccountName: bankDetails.accountHolderName,
      StatementText: "Jones Legacy Creations",
    },
  };

  const res = await qboFetch(`vendor?${MV}`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw qboError(res, err, "QBO update vendor bank details");
  }
}

// ─── Vendor contractor info (EIN, address from W9) ───────────────────────────

export interface QBOContractorInfo {
  /** Printed on checks and 1099s — typically business name or individual name */
  legalName?: string;
  /** Business/company name (CompanyName in QBO API — shows as "Business name" in QBO UI) */
  businessName?: string;
  ein?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export async function updateVendorContractorInfo(
  vendorQboId: string,
  info: QBOContractorInfo
): Promise<void> {
  const getRes = await qboFetch(`vendor/${vendorQboId}?${MV}`);
  if (!getRes.ok) throw new Error("Failed to fetch vendor from QBO");
  const { Vendor } = await getRes.json();

  const hasAddr = info.address || info.city || info.state || info.zip;
  const body: Record<string, unknown> = {
    Id: vendorQboId,
    SyncToken: Vendor.SyncToken,
    sparse: true,
    ...(info.legalName ? { PrintOnCheckName: info.legalName } : {}),
    ...(info.businessName ? { CompanyName: info.businessName } : {}),
    ...(info.ein ? { TaxIdentifier: info.ein } : {}),
    ...(hasAddr
      ? {
          BillAddr: {
            ...(info.address ? { Line1: info.address } : {}),
            ...(info.city ? { City: info.city } : {}),
            ...(info.state ? { CountrySubDivisionCode: info.state } : {}),
            ...(info.zip ? { PostalCode: info.zip } : {}),
            Country: "US",
          },
        }
      : {}),
  };

  const res = await qboFetch(`vendor?${MV}`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw qboError(res, err, "QBO vendor info update");
  }
}

// ─── Attachments ─────────────────────────────────────────────────────────────

/**
 * Core upload helper — downloads a file from a URL and attaches it to any QBO entity.
 */
async function uploadAttachment(
  entityType: "Vendor" | "Bill",
  entityId: string,
  fileUrl: string,
  fileName: string
): Promise<void> {
  const { accessToken, realmId } = await getValidAccessToken();

  const fileRes = await fetch(fileUrl);
  if (!fileRes.ok) {
    throw new Error(`Failed to download file from storage: ${fileRes.status}`);
  }
  const fileBuffer = await fileRes.arrayBuffer();
  const contentType =
    fileRes.headers.get("content-type") ??
    (fileName.endsWith(".pdf") ? "application/pdf" : "application/octet-stream");

  const metadataJson = JSON.stringify({
    ContentType: contentType,
    FileName: fileName,
    AttachableRef: [{ EntityRef: { type: entityType, value: entityId } }],
  });

  const formData = new FormData();
  formData.append("file_metadata_01", new Blob([metadataJson], { type: "application/json" }));
  formData.append("file_content_01", new Blob([fileBuffer], { type: contentType }), fileName);

  const url = `${QBO_BASE_URL}/v3/company/${realmId}/upload`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw qboError(res, err, "QBO attachment upload");
  }
}

// ─── Entity map helpers ───────────────────────────────────────────────────────

export { qboQuery };

// ─── Attachment exports ───────────────────────────────────────────────────────

export async function uploadVendorAttachment(
  vendorQboId: string,
  fileUrl: string,
  fileName: string
): Promise<void> {
  return uploadAttachment("Vendor", vendorQboId, fileUrl, fileName);
}

export async function uploadBillAttachment(
  billQboId: string,
  fileUrl: string,
  fileName: string
): Promise<void> {
  return uploadAttachment("Bill", billQboId, fileUrl, fileName);
}
