import { createHash } from "node:crypto";
import { adminClient } from "@/lib/supabase/admin";

export const PLAN_LIMITS = {
  free: { questionsPerMonth: 100, documents: 5 },
  pro: { questionsPerMonth: 2000, documents: 50 },
} as const;

const PER_MINUTE = 5;
const PER_DAY = 40;

/** Visitors are counted by a one-way hash of their IP, never the IP itself. */
export function hashIp(ip: string) {
  return createHash("sha256")
    .update(`${ip}:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`)
    .digest("hex")
    .slice(0, 32);
}

export type LimitResult = { ok: true } | { ok: false; reason: "visitor" | "workspace" };

export async function checkLimits(
  workspace: { id: string; plan: "free" | "pro" },
  ipHash: string,
): Promise<LimitResult> {
  const db = adminClient();
  const since = (ms: number) => new Date(Date.now() - ms).toISOString();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const count = async (filter: (q: ReturnType<typeof base>) => ReturnType<typeof base>) => {
    const { count } = await filter(base());
    return count ?? 0;
  };
  const base = () => db.from("questions").select("id", { count: "exact", head: true });

  const [minute, day, month] = await Promise.all([
    count((q) => q.eq("ip_hash", ipHash).gte("created_at", since(60_000))),
    count((q) => q.eq("ip_hash", ipHash).gte("created_at", since(86_400_000))),
    count((q) => q.eq("workspace_id", workspace.id).gte("created_at", monthStart.toISOString())),
  ]);

  if (minute >= PER_MINUTE || day >= PER_DAY) return { ok: false, reason: "visitor" };
  if (month >= PLAN_LIMITS[workspace.plan].questionsPerMonth) return { ok: false, reason: "workspace" };
  return { ok: true };
}
