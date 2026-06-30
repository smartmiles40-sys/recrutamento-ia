import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";

const ALLOWED_ROLES = ["admin", "recruiter", "reader"];

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, role, roleLoading, signOut } = useAuth();

  // Wait for the session AND, when logged in, for the role to resolve — so we
  // never flash "access denied" at a legitimate user while the role loads.
  if (loading || (user && roleLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Authenticated but without a team role: no access to candidate data. Accounts
  // are provisioned by an admin (Configurações → Usuários).
  if (!role || !ALLOWED_ROLES.includes(role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md space-y-4 rounded-xl border border-border bg-card p-8 text-center shadow-card">
          <ShieldAlert className="mx-auto h-10 w-10 text-warning" />
          <h1 className="font-display text-xl font-bold text-foreground">Acesso ainda não liberado</h1>
          <p className="text-sm text-muted-foreground">
            Sua conta foi criada, mas ainda não tem permissão para acessar o sistema.
            Peça a um administrador para liberar seu acesso em Configurações → Usuários.
          </p>
          <button
            onClick={() => signOut()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
