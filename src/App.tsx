import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Jobs from "./pages/Jobs";
import Candidates from "./pages/Candidates";
import CandidateDetail from "./pages/CandidateDetail";
import PublicApplicationForm from "./pages/PublicApplicationForm";
import JobConfig from "./pages/JobConfig";
import Settings from "./pages/Settings";
import Approved from "./pages/Approved";
import Rejected from "./pages/Rejected";
import PublicJobs from "./pages/PublicJobs";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
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
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
