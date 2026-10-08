/*
  Called after the browser has uploaded a file to the owner's own Storage folder.
  Records the document and turns it into searchable passages.
*/
import { currentOwner } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { ingestDocument } from "@/lib/ingest";
import { PLAN_LIMITS } from "@/lib/limits";

export const maxDuration = 60;

export async function POST(request: Request) {
  const owner = await currentOwner();
  if (!owner) return Response.json({ error: "Sign in to add documents." }, { status: 401 });
  const { db, workspace } = owner;

  const body = await request.json().catch(() => null);
  const storagePath = typeof body?.path === "string" ? body.path : "";
  const fileName = typeof body?.fileName === "string" ? body.fileName.slice(0, 200) : "";

  // The file must sit in this owner's own folder, as one plain file name.
  const [folder, file, ...rest] = storagePath.split("/");
  if (folder !== workspace.id || !file || rest.length || !/\.(pdf|txt|md)$/i.test(fileName)) {
    return Response.json({ error: "That upload isn't valid. Try choosing the file again." }, { status: 400 });
  }

  const { count } = await db
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspace.id);
  if ((count ?? 0) >= PLAN_LIMITS[workspace.plan].documents) {
    await db.storage.from("documents").remove([storagePath]);
    return Response.json(
      { error: `Your ${workspace.plan === "free" ? "Free" : "Pro"} plan holds ${PLAN_LIMITS[workspace.plan].documents} documents. Delete one or upgrade to add more.` },
      { status: 403 },
    );
  }

  // Inserted as the owner, so row-level security checks the workspace too.
  const { data: doc, error } = await db
    .from("documents")
    .insert({ workspace_id: workspace.id, file_name: fileName, storage_path: storagePath })
    .select("id")
    .single();
  if (error || !doc) {
    return Response.json({ error: "Couldn't save that document. Try again." }, { status: 500 });
  }

  try {
    await ingestDocument(doc.id);
    return Response.json({ status: "ready" });
  } catch (e) {
    const { data } = await adminClient().from("documents").select("error").eq("id", doc.id).single();
    console.error("ingest failed", e);
    return Response.json({ status: "failed", error: data?.error ?? "Couldn't read that file." }, { status: 422 });
  }
}
