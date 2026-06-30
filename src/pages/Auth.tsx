import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";

// Cadastro público foi removido: contas são criadas por um admin em
// Configurações → Usuários. Aqui só há login e recuperação de senha.
type Mode = "login" | "reset";

export default function Auth() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/redefinir-senha`,
        });
        if (error) throw error;
        toast({
          title: "Email enviado!",
          description: "Se houver uma conta com este email, você receberá um link para redefinir a senha.",
        });
        setMode("login");
      }
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message || "Erro ao processar",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const titles: Record<Mode, string> = {
    login: "Entrar",
    reset: "Redefinir senha",
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
          <h1 className="font-display text-2xl font-bold text-foreground">
            Se Tu For, Eu Vou
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sistema de Recrutamento por Alta Performance
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="font-display text-lg font-bold text-foreground">{titles[mode]}</h2>

          {mode === "reset" && (
            <p className="text-sm text-muted-foreground">
              Informe seu email e enviaremos um link para você criar uma nova senha.
            </p>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          {mode !== "reset" && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-sm font-medium text-foreground">Senha</label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => setMode("reset")}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pr-10`}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "login" ? "Entrar" : "Enviar link de recuperação"}
          </button>

          {mode === "reset" && (
            <p className="text-center text-sm text-muted-foreground">
              <button
                type="button"
                onClick={() => setMode("login")}
                className="font-semibold text-foreground hover:underline"
              >
                Voltar para o login
              </button>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
