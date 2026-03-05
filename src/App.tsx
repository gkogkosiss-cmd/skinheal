import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import SkinAnalysis from "./pages/SkinAnalysis";
import HealingProtocol from "./pages/HealingProtocol";
import Nutrition from "./pages/Nutrition";
import GutHealth from "./pages/GutHealth";
import Lifestyle from "./pages/Lifestyle";
import Progress from "./pages/Progress";
import AICoach from "./pages/AICoach";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/analysis" element={<SkinAnalysis />} />
          <Route path="/protocol" element={<HealingProtocol />} />
          <Route path="/nutrition" element={<Nutrition />} />
          <Route path="/gut-health" element={<GutHealth />} />
          <Route path="/lifestyle" element={<Lifestyle />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/coach" element={<AICoach />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
