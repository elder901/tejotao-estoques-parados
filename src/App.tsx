import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Home from "./pages/Home";
import AppLayout from "./layouts/AppLayout";
import ActionPlans from "./pages/ActionPlans";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import ErpSync from "./pages/ErpSync";
import ErpConnect from "./pages/ErpConnect";
import Ruptura from "./pages/Ruptura";
import Indicadores from "./pages/Indicadores";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Home />} />
              <Route path="/estoques-parados" element={<Index />} />
              <Route path="/estoque" element={<Navigate to="/estoques-parados" replace />} />
              <Route path="/planos" element={<ActionPlans />} />
              <Route path="/ruptura" element={<Ruptura />} />
              <Route path="/indicadores" element={<Indicadores />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/erp" element={<ErpConnect />} />
              <Route path="/erp-dados" element={<ErpSync />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
