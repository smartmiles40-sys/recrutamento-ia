import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { buildAdminClient, resolveCaller } from "../_shared/auth.ts";
import { checkRateLimit, clientKey } from "../_shared/rate-limit.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES = new Set(["admin", "recruiter", "reader"]);

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "Senha deve ter ao menos 8 caracteres.";
  if (!/[a-zA-Z]/.test(pw)) return "Senha deve conter pelo menos uma letra.";
  if (!/[0-9]/.test(pw)) return "Senha deve conter pelo menos um número.";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = buildAdminClient();
    const caller = await resolveCaller(req, admin);

    if (!caller.isAuthenticated) return jsonResponse({ error: "Não autorizado" }, 401);
    if (!caller.isAdmin) return jsonResponse({ error: "Apenas admins podem criar usuários" }, 403);

    const rate = await checkRateLimit(admin, clientKey(req, caller.userId), {
      functionName: "create-user",
      windowSeconds: 60,
      maxRequests: 10,
    });
    if (!rate.allowed) {
      return jsonResponse({ error: "Rate limit excedido.", reset_at: rate.resetAt }, 429);
    }

    const { email, password, name, role } = await req.json();
    if (!email || !password || !name || !role) {
      return jsonResponse({ error: "Campos obrigatórios: email, password, name, role" }, 400);
    }
    if (!EMAIL_RE.test(String(email))) {
      return jsonResponse({ error: "Email inválido" }, 400);
    }
    if (!VALID_ROLES.has(String(role))) {
      return jsonResponse({ error: `Role inválida. Use uma de: ${[...VALID_ROLES].join(", ")}` }, 400);
    }
    const pwError = validatePassword(String(password));
    if (pwError) return jsonResponse({ error: pwError }, 400);

    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: name },
    });

    if (createError) {
      return jsonResponse({ error: createError.message }, 400);
    }

    // handle_new_user trigger inserts default role (admin if first user,
    // recruiter otherwise). Override only if requested role differs.
    if (role !== "recruiter") {
      await admin.from("user_roles").update({ role }).eq("user_id", newUser.user.id);
    }

    console.log(`[create-user] caller=${caller.userId} created user=${newUser.user.id} role=${role}`);
    return jsonResponse({ success: true, user_id: newUser.user.id });
  } catch (err) {
    console.error("[create-user] error:", err instanceof Error ? err.message : err);
    return jsonResponse({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
