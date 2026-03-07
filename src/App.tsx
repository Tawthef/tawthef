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
import CVBuilder from "./pages/CVBuilder";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleProtectedRoute from "./components/RoleProtectedRoute";
import Reports from "./pages/Reports";
import FeaturePlaceholder from "./pages/FeaturePlaceholder";
import { CookieConsent } from "./components/privacy/CookieConsent";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import CookiePolicy from "./pages/CookiePolicy";
import TalentSearch from "./pages/TalentSearch";
import ResumeSearch from "./pages/ResumeSearch";
import AdminOverview from "./pages/AdminOverview";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminOrganizations from "./pages/admin/AdminOrganizations";
import AdminJobs from "./pages/admin/AdminJobs";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminAuditLogs from "./pages/admin/AdminAuditLogs";
import AdminRecruiterVerification from "./pages/admin/AdminRecruiterVerification";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminBilling from "./pages/admin/AdminBilling";
import AdminPlatformSettings from "./pages/admin/AdminPlatformSettings";
import AdminLogin from "./pages/AdminLogin";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";
import NotificationsPage from "./pages/NotificationsPage";
import MessagesPage from "./pages/MessagesPage";
import TalentPools from "./pages/TalentPools";
import CandidateProfilePage from "./pages/CandidateProfilePage";
import PublicJobs from "./pages/PublicJobs";
import PublicJobDetails from "./pages/PublicJobDetails";
import JobPipeline from "./pages/JobPipeline";

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
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/register" element={<Register />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/jobs" element={<PublicJobs />} />
          <Route path="/jobs/:id" element={<PublicJobDetails />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/cookie-policy" element={<CookiePolicy />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/cancel" element={<PaymentCancel />} />

          {/* Protected routes - require authentication */}
          {/* Base Protected Routes (Authenticated & Profile exists) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/account/setup" element={<AccountSetup />} />

            {/* Common Routes - Accessible by all roles */}
            <Route element={<RoleProtectedRoute allowedRoles={['candidate', 'employer', 'agency', 'admin', 'expert']} />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/dashboard/settings" element={<Settings />} />
            </Route>

            <Route element={<RoleProtectedRoute allowedRoles={['candidate', 'employer', 'agency', 'admin']} />}>
              <Route path="/dashboard/interviews" element={<Interviews />} />
            </Route>

            {/* Notifications (All roles) */}
            <Route element={<RoleProtectedRoute allowedRoles={['candidate', 'employer', 'agency', 'admin', 'expert']} />}>
              <Route path="/dashboard/notifications" element={<NotificationsPage />} />
            </Route>

            {/* Messaging (Recruiters + Candidates) */}
            <Route element={<RoleProtectedRoute allowedRoles={['candidate', 'employer', 'agency', 'admin']} />}>
              <Route path="/dashboard/messages" element={<MessagesPage />} />
            </Route>

            {/* Candidate Only Routes */}
            <Route element={<RoleProtectedRoute allowedRoles={['candidate']} />}>
              <Route path="/dashboard/profile" element={<Profile />} />
              <Route path="/dashboard/applications" element={<Applications />} />
              <Route path="/dashboard/my-matches" element={<MyJobMatches />} />
              <Route path="/dashboard/cv-builder" element={<CVBuilder />} />
            </Route>

            {/* Candidate + Recruiters (Shared but View differs) */}
            <Route element={<RoleProtectedRoute allowedRoles={['candidate', 'employer', 'agency', 'admin']} />}>
              <Route path="/dashboard/jobs" element={<Jobs />} />
            </Route>

            {/* Recruiters + Admin */}
            <Route element={<RoleProtectedRoute allowedRoles={['employer', 'agency', 'admin']} />}>
              <Route path="/dashboard/reports" element={<Reports />} />
              <Route path="/dashboard/talent-search" element={<TalentSearch />} />
              <Route path="/dashboard/talent-pools" element={<TalentPools />} />
              <Route path="/dashboard/resume-search" element={<ResumeSearch />} />
              <Route path="/dashboard/candidates" element={<Candidates />} />
              <Route path="/dashboard/candidates/:candidateId" element={<CandidateProfilePage />} />
              <Route path="/dashboard/jobs/:jobId/report" element={<JobReport />} />
              <Route path="/dashboard/pipeline" element={<Pipeline />} />
              <Route path="/dashboard/offers" element={<Offers />} />
              <Route path="/dashboard/analytics" element={<Analytics />} />
            </Route>

            {/* Employer Only */}
            <Route element={<RoleProtectedRoute allowedRoles={['employer']} />}>
              <Route path="/dashboard/rankings" element={<RankedCandidates />} />
              <Route path="/dashboard/ai-matches" element={<JobMatchedCandidates />} />
              <Route path="/dashboard/team" element={<FeaturePlaceholder title="Team Management" description="Manage your hiring team and permissions." />} />
            </Route>

            {/* Agency Only */}
            <Route element={<RoleProtectedRoute allowedRoles={['agency']} />}>
              <Route path="/dashboard/submissions" element={<AgencySubmissions />} />
              <Route path="/dashboard/agencies" element={<FeaturePlaceholder title="Agency Network" description="Manage partner agencies and recruiters." />} />
            </Route>

            {/* Employer + Agency: Job Pipeline Kanban */}
            <Route element={<RoleProtectedRoute allowedRoles={['employer', 'agency']} />}>
              <Route path="/dashboard/jobs/:id/pipeline" element={<JobPipeline />} />
            </Route>

            {/* Agency + Expert: Technical Reviews */}
            <Route element={<RoleProtectedRoute allowedRoles={['agency', 'expert', 'admin']} />}>
              <Route path="/dashboard/reviews" element={<TechnicalReviews />} />
              <Route path="/dashboard/completed" element={<TechnicalReviews />} />
            </Route>

            {/* Admin Only */}
            <Route element={<RoleProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/dashboard/billing" element={<Billing />} />
              <Route path="/dashboard/admin/overview" element={<AdminOverview />} />
              <Route path="/dashboard/admin/users" element={<AdminUsers />} />
              <Route path="/dashboard/admin/organizations" element={<AdminOrganizations />} />
              <Route path="/dashboard/admin/jobs" element={<AdminJobs />} />
              <Route path="/dashboard/admin/subscriptions" element={<AdminSubscriptions />} />
              <Route path="/dashboard/admin/analytics" element={<AdminAnalytics />} />
              <Route path="/dashboard/admin/audit" element={<AdminAuditLogs />} />
              <Route path="/dashboard/admin/recruiter-verification" element={<AdminRecruiterVerification />} />
              <Route path="/dashboard/admin/notifications" element={<AdminNotifications />} />
              <Route path="/dashboard/admin/billing" element={<AdminBilling />} />
              <Route path="/dashboard/admin/settings" element={<AdminPlatformSettings />} />
              <Route path="/dashboard/tenants" element={<FeaturePlaceholder title="Tenant Management" description="Manage platform recruiters and workspaces." />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
        <CookieConsent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
