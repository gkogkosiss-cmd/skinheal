import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CurrentAnalysisProvider } from "@/hooks/useCurrentAnalysis";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import SkinAnalysis from "./pages/SkinAnalysis";
import HealingProtocol from "./pages/HealingProtocol";
import Nutrition from "./pages/Nutrition";
import GutHealth from "./pages/GutHealth";
import Lifestyle from "./pages/Lifestyle";
import Progress from "./pages/Progress";
import AICoach from "./pages/AICoach";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <SubscriptionProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <CurrentAnalysisProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/analysis" element={<SkinAnalysis />} />
                <Route path="/protocol" element={<HealingProtocol />} />
                <Route path="/nutrition" element={<Nutrition />} />
                <Route path="/gut-health" element={<GutHealth />} />
                <Route path="/lifestyle" element={<Lifestyle />} />
                <Route path="/progress" element={<Progress />} />
                <Route path="/coach" element={<AICoach />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </CurrentAnalysisProvider>
          </BrowserRouter>
        </SubscriptionProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
