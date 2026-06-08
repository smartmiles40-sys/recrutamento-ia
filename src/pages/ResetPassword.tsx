import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  // Until Supabase establishes the recovery session from the email link we
  // can't call updateUser. `ready` flips to true on the PASSWORD_RECOVERY /
  // SIGNED_IN event; if there's no session at all the link is invalid/expired.
  const [ready, setReady] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setReady(true);
      }
    });

    // The recovery session may already be set by the time we subscribe.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setReady((prev) => prev ?? !!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "A senha deve ter no mínimo 6 caracteres", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "As senhas não coincidem", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: "Senha redefinida!", description: "Use a nova senha para entrar." });
      await supabase.auth.signOut();
      navigate("/auth");
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message || "Não foi possível redefinir a senha",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary font-display text-lg font-bold text-primary-foreground">
            SV
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Redefinir senha</h1>
          <p className="mt-1 text-sm text-muted-foreground">Escolha uma nova senha para sua conta</p>
        </div>

        {ready === false ? (
          <div className="space-y-4 rounded-xl border border-border bg-card p-6 text-center shadow-card">
            <p className="text-sm text-muted-foreground">
              Este link de redefinição é inválido ou expirou. Solicite um novo na tela de login.
            </p>
            <button
              onClick={() => navigate("/auth")}
              className="flex h-10 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Voltar para o login
            </button>
          </div>
        ) : ready === null ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-card">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Nova senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                required
                minLength={6}
                autoFocus
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Confirmar nova senha</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={inputClass}
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar nova senha
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
