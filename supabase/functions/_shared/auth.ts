import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface CallerContext {
  isAuthenticated: boolean;
  userId: string | null;
  role: string | null;
  isAdmin: boolean;
  isRecruiterOrAdmin: boolean;
}

const PUBLIC_CANDIDATE_WINDOW_MIN = 60;

export function buildAdminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export async function resolveCaller(req: Request, admin: SupabaseClient): Promise<CallerContext> {
  const authHeader = req.headers.get("Authorization");
  const ctx: CallerContext = {
    isAuthenticated: false,
    userId: null,
    role: null,
    isAdmin: false,
    isRecruiterOrAdmin: false,
  };

  if (!authHeader) return ctx;

  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) return ctx;

  ctx.isAuthenticated = true;
  ctx.userId = user.id;

  const { data: roleRow } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  ctx.role = roleRow?.role ?? null;
  ctx.isAdmin = ctx.role === "admin";
  ctx.isRecruiterOrAdmin = ctx.role === "admin" || ctx.role === "recruiter";
  return ctx;
}

// Anonymous callers (public application form) are only allowed to trigger
// analysis on a candidate row they JUST created. We treat that as a soft
// authorization: candidate must exist and have been created in the last
// `PUBLIC_CANDIDATE_WINDOW_MIN` minutes.
export async function assertCandidateAccess(
  admin: SupabaseClient,
  caller: CallerContext,
  candidateId: string,
): Promise<{ allowed: boolean; reason?: string; jobId?: string }> {
  const { data: candidate, error } = await admin
    .from("candidates")
    .select("id, job_id, created_at")
    .eq("id", candidateId)
    .maybeSingle();

  if (error || !candidate) return { allowed: false, reason: "candidate_not_found" };

  if (caller.isAdmin) return { allowed: true, jobId: candidate.job_id };

  if (caller.isRecruiterOrAdmin) {
    const { data: job } = await admin
      .from("jobs")
      .select("created_by")
      .eq("id", candidate.job_id)
      .maybeSingle();
    if (!job) return { allowed: false, reason: "job_not_found" };
    if (job.created_by === caller.userId) return { allowed: true, jobId: candidate.job_id };
    return { allowed: false, reason: "not_job_owner" };
  }

  // Anonymous caller — must be a freshly-created candidate.
  const createdAt = new Date(candidate.created_at).getTime();
  const ageMin = (Date.now() - createdAt) / 60_000;
  if (ageMin > PUBLIC_CANDIDATE_WINDOW_MIN) {
    return { allowed: false, reason: "candidate_too_old_for_anon" };
  }
  return { allowed: true, jobId: candidate.job_id };
}
