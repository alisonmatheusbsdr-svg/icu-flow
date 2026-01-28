import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { UnitProvider } from "@/hooks/useUnit";
import { UpdatePrompt } from "@/components/pwa/UpdatePrompt";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import SelectUnit from "./pages/SelectUnit";
import Admin from "./pages/Admin";
import TeamManagement from "./pages/TeamManagement";
import PatientDetails from "./pages/PatientDetails";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <UpdatePrompt />
      <BrowserRouter>
        <AuthProvider>
          <UnitProvider>
            <Routes>
              <Route path="/" element={<Auth />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/select-unit" element={<SelectUnit />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/equipe" element={<TeamManagement />} />
              <Route path="/patient/:patientId" element={<PatientDetails />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </UnitProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;