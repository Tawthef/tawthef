import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AccountSetup from "./pages/AccountSetup";
import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import JobReport from "./pages/JobReport";
import Pricing from "./pages/Pricing";
import Billing from "./pages/Billing";
import Candidates from "./pages/Candidates";
import Applications from "./pages/Applications";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Analytics from "./pages/Analytics";
import Pipeline from "./pages/Pipeline";
import AgencySubmissions from "./pages/AgencySubmissions";
import TechnicalReviews from "./pages/TechnicalReviews";
import Interviews from "./pages/Interviews";
import Offers from "./pages/Offers";
import RankedCandidates from "./pages/RankedCandidates";
import JobMatchedCandidates from "./pages/JobMatchedCandidates";
import MyJobMatches from "./pages/MyJobMatches";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/pricing" element={<Pricing />} />

          {/* Protected routes - require authentication */}
          <Route element={<ProtectedRoute />}>
            <Route path="/account/setup" element={<AccountSetup />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/jobs" element={<Jobs />} />
            <Route path="/dashboard/jobs/:jobId/report" element={<JobReport />} />
            <Route path="/dashboard/candidates" element={<Candidates />} />
            <Route path="/dashboard/applications" element={<Applications />} />
            <Route path="/dashboard/profile" element={<Profile />} />
            <Route path="/dashboard/settings" element={<Settings />} />
            <Route path="/dashboard/billing" element={<Billing />} />
            <Route path="/dashboard/analytics" element={<Analytics />} />
            <Route path="/dashboard/pipeline" element={<Pipeline />} />
            <Route path="/dashboard/submissions" element={<AgencySubmissions />} />
            <Route path="/dashboard/reviews" element={<TechnicalReviews />} />
            <Route path="/dashboard/interviews" element={<Interviews />} />
            <Route path="/dashboard/offers" element={<Offers />} />
            <Route path="/dashboard/rankings" element={<RankedCandidates />} />
            <Route path="/dashboard/ai-matches" element={<JobMatchedCandidates />} />
            <Route path="/dashboard/my-matches" element={<MyJobMatches />} />
            {/* Placeholder routes for remaining sidebar items */}
            <Route path="/dashboard/team" element={<Settings />} />
            <Route path="/dashboard/agencies" element={<Settings />} />
            <Route path="/dashboard/completed" element={<TechnicalReviews />} />
            <Route path="/dashboard/tenants" element={<Settings />} />
            <Route path="/dashboard/users" element={<Settings />} />
            <Route path="/dashboard/logs" element={<Settings />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

