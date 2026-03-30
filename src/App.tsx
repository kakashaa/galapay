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
import BanReport from "./pages/BanReport";
import SpecialId from "./pages/SpecialId";
import SupporterDetails from "./pages/SupporterDetails";
import AdminLogin from "./pages/admin/Login";
import AdminPortal from "./pages/admin/AdminPortal";
import AdminDashboard from "./pages/admin/Dashboard";
import InstantAdminDashboard from "./pages/admin/InstantDashboard";
import BanDashboard from "./pages/admin/BanDashboard";
import SpecialIdDashboard from "./pages/admin/SpecialIdDashboard";
import CoinsDashboard from "./pages/admin/CoinsDashboard";
import WebhooksDashboard from "./pages/admin/WebhooksDashboard";
import VotingDashboard from "./pages/admin/VotingDashboard";
import InstantPayoutIntro from "./pages/instant/InstantPayoutIntro";
import InstantPayoutBanks from "./pages/instant/InstantPayoutBanks";
import InstantPayoutRequest from "./pages/instant/InstantPayoutRequest";
import CoinsPayoutRequest from "./pages/CoinsPayoutRequest";
import EditReservedRequest from "./pages/EditReservedRequest";
import GameVotingPage from "./pages/GameVotingPage";
import NotFound from "./pages/NotFound";
const queryClient = new QueryClient();

// Redirect galapay.lovable.app to galachatpay.lovable.app
if (window.location.hostname === 'galapay.lovable.app') {
  window.location.replace('https://galachatpay.lovable.app' + window.location.pathname + window.location.search + window.location.hash);
}

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
          <Route path="/ban-report" element={<BanReport />} />
          <Route path="/special-id" element={<SpecialId />} />
          <Route path="/supporter/:id" element={<SupporterDetails />} />
          <Route path="/instant" element={<InstantPayoutIntro />} />
          <Route path="/instant/banks" element={<InstantPayoutBanks />} />
          <Route path="/instant/request" element={<InstantPayoutRequest />} />
          <Route path="/coins-payout" element={<CoinsPayoutRequest />} />
          <Route path="/edit-reserved" element={<EditReservedRequest />} />
          <Route path="/game-voting" element={<GameVotingPage />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminPortal />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/instant" element={<InstantAdminDashboard />} />
          <Route path="/admin/bans" element={<BanDashboard />} />
          <Route path="/admin/special-id" element={<SpecialIdDashboard />} />
          <Route path="/admin/coins" element={<CoinsDashboard />} />
          <Route path="/admin/webhooks" element={<WebhooksDashboard />} />
          <Route path="/admin/voting" element={<VotingDashboard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
