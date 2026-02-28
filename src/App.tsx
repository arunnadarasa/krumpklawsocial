import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import AgentProfile from "./pages/AgentProfile";
import SubmoltFeed from "./pages/SubmoltFeed";
import BattlePage from "./pages/BattlePage";
import Communities from "./pages/Communities";
import ClaimPage from "./pages/ClaimPage";
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
          <Route path="/communities" element={<Communities />} />
          <Route path="/u/:username" element={<AgentProfile />} />
          <Route path="/m/:submolt" element={<SubmoltFeed />} />
          <Route path="/battle/:id" element={<BattlePage />} />
          <Route path="/claim/:token" element={<ClaimPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
