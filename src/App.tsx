import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/layout/ProtectedRoute";

const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Index = lazy(() => import("./pages/Index"));
const Jobs = lazy(() => import("./pages/Jobs"));
const Candidates = lazy(() => import("./pages/Candidates"));
const CandidateDetail = lazy(() => import("./pages/CandidateDetail"));
const PublicApplicationForm = lazy(() => import("./pages/PublicApplicationForm"));
const JobConfig = lazy(() => import("./pages/JobConfig"));
const Settings = lazy(() => import("./pages/Settings"));
const Approved = lazy(() => import("./pages/Approved"));
const Rejected = lazy(() => import("./pages/Rejected"));
const PublicJobs = lazy(() => import("./pages/PublicJobs"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/redefinir-senha" element={<ResetPassword />} />
              <Route path="/vagas-abertas" element={<PublicJobs />} />
              <Route path="/aplicar/:jobId" element={<PublicApplicationForm />} />
              <Route path="/privacidade" element={<PrivacyPolicy />} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/vagas" element={<ProtectedRoute><Jobs /></ProtectedRoute>} />
              <Route path="/candidatos" element={<ProtectedRoute><Candidates /></ProtectedRoute>} />
              <Route path="/candidatos/:id" element={<ProtectedRoute><CandidateDetail /></ProtectedRoute>} />
              <Route path="/vagas/:jobId/configurar" element={<ProtectedRoute><JobConfig /></ProtectedRoute>} />
              <Route path="/aprovados" element={<ProtectedRoute><Approved /></ProtectedRoute>} />
              <Route path="/reprovados" element={<ProtectedRoute><Rejected /></ProtectedRoute>} />
              <Route path="/configuracoes" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
