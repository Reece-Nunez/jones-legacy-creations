import type { SupabaseClient } from "@supabase/supabase-js";

export type GeneratedDocCategory = "change_order" | "selection";

/**
 * Upload a server-generated file (a signed change-order / decided-selection PDF)
 * into the private `project-documents` bucket and file it as a `documents` row,
 * so it shows up under the project's Documents tab. Mirrors the insert shape used
 * by app/api/admin/projects/[id]/documents/route.ts.
 *
 * Called from the public (service-role) sign/decide routes, so `admin` must be a
 * service-role client.
 */
export async function uploadGeneratedDoc(
  admin: SupabaseClient,
  opts: {
    projectId: string;
    name: string;
    bytes: Uint8Array;
    category: GeneratedDocCategory;
    contentType?: string;
  }
): Promise<{ id: string; file_url: string }> {
  const { projectId, name, bytes, category, contentType = "application/pdf" } = opts;

  // Strip path separators / traversal so the caller can't shape the storage key.
  const safeName = name.replace(/[\\/]/g, "_").replace(/\.{2,}/g, ".");
  const path = `${projectId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await admin.storage
    .from("project-documents")
    .upload(path, bytes, { contentType });
  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const { data: urlData } = admin.storage
    .from("project-documents")
    .getPublicUrl(path);

  const { data, error } = await admin
    .from("documents")
    .insert({
      project_id: projectId,
      name: safeName,
      file_url: urlData.publicUrl,
      file_type: contentType,
      file_size: bytes.length,
      category,
    })
    .select("id, file_url")
    .single();

  if (error) {
    throw new Error(`Document insert failed: ${error.message}`);
  }

  return data as { id: string; file_url: string };
}
