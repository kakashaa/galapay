import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Confirm from "./pages/Confirm";
import PayoutRequest from "./pages/PayoutRequest";
import Success from "./pages/Success";
import Track from "./pages/Track";
import AdminLogin from "./pages/admin/Login";
import AdminPortal from "./pages/admin/AdminPortal";
import AdminDashboard from "./pages/admin/Dashboard";
import InstantAdminDashboard from "./pages/admin/InstantDashboard";
import InstantPayoutIntro from "./pages/instant/InstantPayoutIntro";
import InstantPayoutBanks from "./pages/instant/InstantPayoutBanks";
import InstantPayoutRequest from "./pages/instant/InstantPayoutRequest";
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
          <Route path="/confirm" element={<Confirm />} />
          <Route path="/request" element={<PayoutRequest />} />
          <Route path="/success" element={<Success />} />
          <Route path="/track" element={<Track />} />
          <Route path="/instant" element={<InstantPayoutIntro />} />
          <Route path="/instant/banks" element={<InstantPayoutBanks />} />
          <Route path="/instant/request" element={<InstantPayoutRequest />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminPortal />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/instant" element={<InstantAdminDashboard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
