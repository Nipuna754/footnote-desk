"use server";

import { revalidatePath } from "next/cache";
import { currentOwner } from "@/lib/supabase/server";

/* Both actions run as the signed-in owner, so row-level security limits them to their own workspace. */

export async function deleteDocument(form: FormData) {
  const owner = await currentOwner();
  const id = String(form.get("id") ?? "");
  if (!owner || !id) return;
  const { data: doc } = await owner.db
    .from("documents")
    .delete()
    .eq("id", id)
    .select("storage_path")
    .single();
  if (doc) await owner.db.storage.from("documents").remove([doc.storage_path]);
  revalidatePath("/dashboard");
}

export async function markHandled(form: FormData) {
  const owner = await currentOwner();
  const question = String(form.get("question") ?? "");
  if (!owner || !question) return;
  await owner.db
    .from("questions")
    .update({ handled: true })
    .eq("workspace_id", owner.workspace.id)
    .eq("answered", false)
    .ilike("question", question.replace(/[%_\\]/g, "\\$&"));
  revalidatePath("/dashboard");
}

export async function renameWorkspace(form: FormData) {
  const owner = await currentOwner();
  const name = String(form.get("name") ?? "").trim();
  if (!owner || !name || name.length > 80) return;
  // Owners may update only the name column (database grant); RLS limits it to their own workspace.
  await owner.db.from("workspaces").update({ name }).eq("id", owner.workspace.id);
  revalidatePath("/dashboard");
}
