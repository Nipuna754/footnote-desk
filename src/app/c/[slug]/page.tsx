import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Chat } from "@/components/Chat/Chat";
import { adminClient } from "@/lib/supabase/admin";
import styles from "../../page.module.css";

/** A workspace's public help page. Only its name and ready file names are shown. */
const load = cache(async (slug: string) => {
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) return null;
  const db = adminClient();
  const { data: workspace } = await db.from("workspaces").select("id, name, slug").eq("slug", slug).single();
  if (!workspace) return null;
  const { data: docs } = await db
    .from("documents")
    .select("file_name")
    .eq("workspace_id", workspace.id)
    .eq("status", "ready")
    .order("created_at");
  return { name: workspace.name as string, slug: workspace.slug as string, documents: (docs ?? []).map((d) => d.file_name as string) };
});

export async function generateMetadata({ params }: PageProps<"/c/[slug]">): Promise<Metadata> {
  const help = await load((await params).slug);
  return { title: help ? `${help.name} help` : "Help centre not found", robots: { index: false } };
}

export default async function HelpPage({ params }: PageProps<"/c/[slug]">) {
  const help = await load((await params).slug);
  if (!help) notFound();
  return (
    <main id="main" className={`container ${styles.main}`}>
      <div className={styles.intro}>
        <h1 className={styles.title}>{help.name}</h1>
        <p className={styles.demoNote}>
          Answers come only from {help.name}&rsquo;s documents, with the page each one came from.
        </p>
      </div>
      <Chat company={{ name: help.name, slug: help.slug }} documents={help.documents} />
    </main>
  );
}
