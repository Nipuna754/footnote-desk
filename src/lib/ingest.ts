/*
  Turns an uploaded file into searchable passages:
  download → text per page → passages → embeddings → chunks table.
*/
import { extractText, getDocumentProxy } from "unpdf";
import { adminClient } from "@/lib/supabase/admin";
import { ai } from "@/lib/ai";

const TARGET = 700; // characters per passage, roughly a paragraph or two

export async function pagesFromFile(name: string, bytes: Uint8Array): Promise<string[]> {
  if (name.toLowerCase().endsWith(".pdf")) {
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: false });
    return text;
  }
  // Text and Markdown: a form feed marks a page break; otherwise it's all page 1.
  return new TextDecoder().decode(bytes).split("\f");
}

/** Splits a page into passages at sentence boundaries, carrying one sentence over. */
export function passages(pageText: string): string[] {
  const clean = pageText.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const sentences = clean.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [clean];
  const out: string[] = [];
  let current: string[] = [];
  for (const s of sentences) {
    if (current.join("").length + s.length > TARGET && current.length) {
      out.push(current.join("").trim());
      current = [current[current.length - 1]];
    }
    current.push(s);
  }
  if (current.length) out.push(current.join("").trim());
  return out;
}

export async function ingestDocument(documentId: string) {
  const db = adminClient();
  const { data: doc, error } = await db
    .from("documents")
    .select("id, workspace_id, file_name, storage_path")
    .eq("id", documentId)
    .single();
  if (error || !doc) throw new Error("Document not found");

  try {
    const { data: file, error: dlError } = await db.storage.from("documents").download(doc.storage_path);
    if (dlError || !file) throw new Error("Couldn't download the file");

    const pages = await pagesFromFile(doc.file_name, new Uint8Array(await file.arrayBuffer()));
    const rows = pages.flatMap((text, i) => passages(text).map((content) => ({ page: i + 1, content })));
    if (rows.length === 0) throw new Error("No text found. Scanned PDFs need text, not just images.");

    const vectors = await ai().embed(rows.map((r) => r.content), "document");

    await db.from("chunks").delete().eq("document_id", doc.id);
    const { error: insertError } = await db.from("chunks").insert(
      rows.map((r, i) => ({
        document_id: doc.id,
        workspace_id: doc.workspace_id,
        page: r.page,
        content: r.content,
        embedding: JSON.stringify(vectors[i]),
      })),
    );
    if (insertError) throw new Error(insertError.message);

    await db.from("documents").update({ status: "ready", pages: pages.length, error: null }).eq("id", doc.id);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Processing failed";
    await db.from("documents").update({ status: "failed", error: message }).eq("id", doc.id);
    throw e;
  }
}
