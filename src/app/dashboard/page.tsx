import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentOwner } from "@/lib/supabase/server";
import { PLAN_LIMITS } from "@/lib/limits";
import { UploadBox } from "@/components/UploadBox/UploadBox";
import { signOut } from "@/app/auth-actions";
import { deleteDocument, markHandled } from "./actions";
import styles from "./dashboard.module.css";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false },
};

type DocStatus = "ready" | "processing" | "failed";

const date = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const fmt = (iso: string) => date.format(new Date(iso));

const statusLabel: Record<DocStatus, string> = {
  ready: "Ready",
  processing: "Processing",
  failed: "Couldn’t read file",
};

const upgradeMessages: Record<string, string> = {
  success: "Payment received. Your plan switches to Pro as soon as Lemon Squeezy confirms it, usually within a few seconds. Refresh if it still says Free.",
  error: "Couldn't open the billing page. Try again in a minute.",
};

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const upgrade = (await searchParams).upgrade;
  const upgradeMessage = typeof upgrade === "string" ? upgradeMessages[upgrade] : undefined;
  const owner = await currentOwner();
  if (!owner) redirect("/signin");
  const { db, workspace, user } = owner;
  const limits = PLAN_LIMITS[workspace.plan];

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [{ data: docs }, { data: open }, { data: month }] = await Promise.all([
    db
      .from("documents")
      .select("id, file_name, pages, created_at, status, error")
      .order("created_at", { ascending: false }),
    db
      .from("questions")
      .select("question, created_at")
      .eq("answered", false)
      .eq("handled", false)
      .order("created_at", { ascending: false })
      .limit(500),
    db.from("questions").select("answered").gte("created_at", monthStart.toISOString()),
  ]);

  // The same question asked several times shows once, with a count.
  const grouped = new Map<string, { question: string; times: number; lastAsked: string }>();
  for (const q of open ?? []) {
    const key = q.question.toLowerCase().replace(/\s+/g, " ").replace(/[?.!\s]+$/, "");
    const g = grouped.get(key);
    if (g) g.times += 1;
    else grouped.set(key, { question: q.question, times: 1, lastAsked: q.created_at });
  }
  const unanswered = [...grouped.values()].sort((a, b) => b.times - a.times);

  const documents = docs ?? [];
  const used = month?.length ?? 0;
  const answeredShare = used ? Math.round(((month ?? []).filter((q) => q.answered).length / used) * 100) : null;

  return (
    <main id="main" className={`container ${styles.main}`}>
      {upgradeMessage && (
        <p role="status" className={styles.banner}>
          {upgradeMessage}
        </p>
      )}
      <header className={styles.head}>
        <div>
          <p className={styles.kicker}>Signed in as {user.email}</p>
          <h1 className={styles.title}>{workspace.name}</h1>
          <p className={styles.helpLink}>
            Your help page: <Link href={`/c/${workspace.slug}`}>/c/{workspace.slug}</Link>
          </p>
        </div>
        <div className={styles.plan}>
          <p>
            <strong>{workspace.plan === "pro" ? "Pro" : "Free"} plan.</strong> {used} of{" "}
            {limits.questionsPerMonth.toLocaleString("en")} questions used this month.
            {answeredShare !== null && ` ${answeredShare}% answered from your documents.`}
          </p>
          <progress
            className={styles.meter}
            value={used}
            max={limits.questionsPerMonth}
            aria-label="Questions used this month"
          />
          <div className={styles.planActions}>
            {workspace.plan === "free" ? (
              <form action="/api/billing/checkout" method="post">
                <button className={styles.upgrade}>Upgrade to Pro</button>
              </form>
            ) : (
              <form action="/api/billing/portal" method="post">
                <button className={styles.textButton}>Manage billing</button>
              </form>
            )}
            <form action={signOut}>
              <button className={styles.textButton}>Sign out</button>
            </form>
          </div>
        </div>
      </header>

      <section className={styles.section} aria-labelledby="unanswered-title">
        <h2 id="unanswered-title" className={styles.sectionTitle}>
          Unanswered questions <span className={styles.count}>{unanswered.length}</span>
        </h2>
        <p className={styles.help}>
          Customers asked these and your documents had no answer. Upload a document that
          covers them, then mark the question as handled.
        </p>
        {unanswered.length === 0 ? (
          <p className={styles.emptyRow}>Nothing waiting. Every question so far was answered from your documents.</p>
        ) : (
          <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Unanswered questions table, scrollable">
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Question</th>
                  <th scope="col" className={styles.num}>Times asked</th>
                  <th scope="col">Last asked</th>
                  <th scope="col"><span className="visually-hidden">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {unanswered.map((q) => (
                  <tr key={q.question}>
                    <td className={styles.questionCell}>{q.question}</td>
                    <td className={styles.num}>{q.times}</td>
                    <td className={styles.date}>{fmt(q.lastAsked)}</td>
                    <td className={styles.actions}>
                      <form action={markHandled}>
                        <input type="hidden" name="question" value={q.question} />
                        <button className={styles.textButton} aria-label={`Mark "${q.question}" as handled`}>
                          Mark handled
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.section} aria-labelledby="documents-title">
        <h2 id="documents-title" className={styles.sectionTitle}>
          Documents{" "}
          <span className={styles.count}>
            {documents.length} of {limits.documents}
          </span>
        </h2>
        {documents.length > 0 && (
          <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Documents table, scrollable">
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">File</th>
                  <th scope="col" className={styles.num}>Pages</th>
                  <th scope="col">Uploaded</th>
                  <th scope="col">Status</th>
                  <th scope="col"><span className="visually-hidden">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {documents.map((d) => (
                  <tr key={d.id}>
                    <td className="mono">{d.file_name}</td>
                    <td className={styles.num}>{d.pages ?? "–"}</td>
                    <td className={styles.date}>{fmt(d.created_at)}</td>
                    <td>
                      <span className={styles.status} data-status={d.status} title={d.error ?? undefined}>
                        {statusLabel[d.status as DocStatus]}
                      </span>
                    </td>
                    <td className={styles.actions}>
                      <form action={deleteDocument}>
                        <input type="hidden" name="id" value={d.id} />
                        <button className={styles.textButton} aria-label={`Delete ${d.file_name}`}>
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <UploadBox workspaceId={workspace.id} remaining={limits.documents - documents.length} />
      </section>
    </main>
  );
}
