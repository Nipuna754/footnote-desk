// Proves one owner can't read or change another owner's data.
// Creates two throwaway owners, tries every cross-access, then deletes them.
// Run: node --experimental-websocket --env-file=.env.local scripts/check-isolation.mjs
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let failures = 0;
const check = (name, ok) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failures++;
};

async function makeOwner(label) {
  const email = `isolation-${label}-${randomUUID().slice(0, 8)}@example.com`;
  const password = randomUUID();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { company: `Test ${label}` },
  });
  if (error) throw error;
  const client = createClient(URL, anonKey, { auth: { persistSession: false } });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  const { data: ws } = await client.from("workspaces").select("id, plan").single();
  return { id: data.user.id, client, workspace: ws };
}

const a = await makeOwner("a");
const b = await makeOwner("b");
try {
  check("sign-up creates a workspace for each owner", Boolean(a.workspace && b.workspace));

  // Owner A's data: a file, a document and an unanswered question.
  const path = `${a.workspace.id}/secret.txt`;
  check("A can upload to A's folder", !(await a.client.storage.from("documents").upload(path, "secret", { contentType: "text/plain" })).error);
  const { data: doc } = await a.client
    .from("documents")
    .insert({ workspace_id: a.workspace.id, file_name: "secret.txt", storage_path: path })
    .select("id")
    .single();
  check("A can add a document to A's workspace", Boolean(doc));
  await admin.from("questions").insert({ workspace_id: a.workspace.id, question: "A's private question", answered: false });

  // Owner B tries to reach it.
  const bWs = await b.client.from("workspaces").select("id").eq("id", a.workspace.id);
  check("B can't see A's workspace", bWs.data?.length === 0);
  const bDocs = await b.client.from("documents").select("id").eq("workspace_id", a.workspace.id);
  check("B can't see A's documents", bDocs.data?.length === 0);
  const bQs = await b.client.from("questions").select("id").eq("workspace_id", a.workspace.id);
  check("B can't see A's questions", bQs.data?.length === 0);
  const bDl = await b.client.storage.from("documents").download(path);
  check("B can't download A's file", Boolean(bDl.error));
  const bUp = await b.client.storage.from("documents").upload(`${a.workspace.id}/planted.txt`, "x", { contentType: "text/plain" });
  check("B can't upload into A's folder", Boolean(bUp.error));
  const bIns = await b.client.from("documents").insert({ workspace_id: a.workspace.id, file_name: "x.txt", storage_path: `${a.workspace.id}/x.txt` });
  check("B can't add a document to A's workspace", Boolean(bIns.error));
  await b.client.from("documents").delete().eq("id", doc.id);
  check("B can't delete A's document", (await admin.from("documents").select("id").eq("id", doc.id)).data?.length === 1);
  await b.client.from("questions").update({ handled: true }).eq("workspace_id", a.workspace.id);
  check("B can't change A's questions", (await admin.from("questions").select("handled").eq("workspace_id", a.workspace.id)).data?.[0]?.handled === false);

  // Owners can't upgrade themselves for free.
  const upgrade = await a.client.from("workspaces").update({ plan: "pro" }).eq("id", a.workspace.id);
  const plan = (await admin.from("workspaces").select("plan").eq("id", a.workspace.id).single()).data?.plan;
  check("A can't change A's own plan", Boolean(upgrade.error) || plan === "free");

  // Signed-out visitors get nothing.
  const anon = createClient(URL, anonKey, { auth: { persistSession: false } });
  check("signed-out visitors can't list workspaces", (await anon.from("workspaces").select("id")).data?.length === 0);
  check("signed-out visitors can't read questions", (await anon.from("questions").select("id")).data?.length === 0);
} finally {
  for (const o of [a, b]) {
    const { data: files } = await admin.storage.from("documents").list(o.workspace?.id ?? "none");
    if (files?.length) await admin.storage.from("documents").remove(files.map((f) => `${o.workspace.id}/${f.name}`));
    await admin.auth.admin.deleteUser(o.id); // cascades to the workspace and its rows
  }
}

console.log(failures ? `\n${failures} check(s) failed` : "\nAll isolation checks passed");
process.exit(failures ? 1 : 0);
