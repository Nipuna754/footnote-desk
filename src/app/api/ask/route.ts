import { adminClient } from "@/lib/supabase/admin";
import { answerQuestion } from "@/lib/answer";
import { AiBusyError, type Turn } from "@/lib/ai";
import { checkLimits, hashIp } from "@/lib/limits";

const BUSY = "Footnote Desk is busy right now. Try again in a minute.";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const slug = typeof body?.workspace === "string" ? body.workspace : "";
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (!/^[a-z0-9-]{3,40}$/.test(slug) || question.length < 3 || question.length > 300) {
    return Response.json({ error: "Ask a question between 3 and 300 characters." }, { status: 400 });
  }

  // Up to 3 earlier turns from the visitor's browser. Treated as context only:
  // every fact in the answer must still come from the documents.
  const history: Turn[] = (Array.isArray(body?.history) ? body.history : [])
    .slice(-3)
    .filter((t: unknown): t is Turn => {
      const turn = t as Turn;
      return typeof turn?.question === "string" && typeof turn?.answer === "string";
    })
    .map((t: Turn) => ({ question: t.question.slice(0, 300), answer: t.answer.slice(0, 1500) }));

  const db = adminClient();
  const { data: workspace } = await db
    .from("workspaces")
    .select("id, name, plan")
    .eq("slug", slug)
    .single();
  if (!workspace) return Response.json({ error: "This help centre doesn't exist." }, { status: 404 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ipHash = hashIp(ip);
  const limit = await checkLimits(workspace, ipHash);
  if (!limit.ok) {
    const error =
      limit.reason === "visitor"
        ? "You've asked a lot of questions in a short time. Wait a minute, then try again."
        : `${workspace.name}'s help centre has reached its question limit for this month.`;
    return Response.json({ error }, { status: 429 });
  }

  try {
    const answer = await answerQuestion(workspace, question, history);
    await db.from("questions").insert({
      workspace_id: workspace.id,
      question,
      answered: answer.kind === "answered",
      citations: answer.kind === "answered" ? answer.citations.map(({ file, page }) => ({ file, page })) : [],
      ip_hash: ipHash,
    });
    return Response.json({ answer });
  } catch (e) {
    if (e instanceof AiBusyError) return Response.json({ error: BUSY }, { status: 503 });
    console.error("ask failed", e);
    return Response.json({ error: "Something went wrong answering that. Try again." }, { status: 500 });
  }
}
