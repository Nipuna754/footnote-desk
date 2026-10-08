/*
  Loads the fictional Aerin Home demo: workspace, the 3 PDFs in demo-docs/,
  and their passages. Development only; returns 404 anywhere else.
  Run: curl -X POST http://localhost:3000/api/dev/seed
*/
import { readFile } from "node:fs/promises";
import path from "node:path";
import { adminClient } from "@/lib/supabase/admin";
import { ingestDocument } from "@/lib/ingest";

const FILES = ["aerin-p3-user-manual.pdf", "warranty-and-returns.pdf", "filter-subscription-faq.pdf"];

export async function POST() {
  if (process.env.NODE_ENV !== "development") return new Response(null, { status: 404 });

  const db = adminClient();
  const { data: workspace, error } = await db
    .from("workspaces")
    .upsert({ slug: "aerin-home", name: "Aerin Home", plan: "pro" }, { onConflict: "slug" })
    .select("id")
    .single();
  if (error || !workspace) return Response.json({ error: error?.message }, { status: 500 });

  const results: Record<string, string> = {};
  for (const file of FILES) {
    const storagePath = `${workspace.id}/${file}`;
    const bytes = await readFile(path.join(process.cwd(), "demo-docs", file));
    const upload = await db.storage
      .from("documents")
      .upload(storagePath, bytes, { contentType: "application/pdf", upsert: true });
    if (upload.error) {
      results[file] = `upload failed: ${upload.error.message}`;
      continue;
    }
    const { data: doc } = await db
      .from("documents")
      .upsert(
        { workspace_id: workspace.id, file_name: file, storage_path: storagePath, status: "processing" },
        { onConflict: "storage_path" },
      )
      .select("id")
      .single();
    try {
      await ingestDocument(doc!.id);
      results[file] = "ready";
    } catch (e) {
      results[file] = `failed: ${e instanceof Error ? e.message : e}`;
    }
  }
  return Response.json({ workspace: "aerin-home", results });
}
