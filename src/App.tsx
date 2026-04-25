import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleProtectedRoute from "./components/RoleProtectedRoute";
import { CookieConsent } from "./components/privacy/CookieConsent";

const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const AccountSetup = lazy(() => import("./pages/AccountSetup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Jobs = lazy(() => import("./pages/Jobs"));
const JobReport = lazy(() => import("./pages/JobReport"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Billing = lazy(() => import("./pages/Billing"));
const Candidates = lazy(() => import("./pages/Candidates"));
const Applications = lazy(() => import("./pages/Applications"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Pipeline = lazy(() => import("./pages/Pipeline"));
const AgencySubmissions = lazy(() => import("./pages/AgencySubmissions"));
const TechnicalReviews = lazy(() => import("./pages/TechnicalReviews"));
const Interviews = lazy(() => import("./pages/Interviews"));
const Offers = lazy(() => import("./pages/Offers"));
const RankedCandidates = lazy(() => import("./pages/RankedCandidates"));
const JobMatchedCandidates = lazy(() => import("./pages/JobMatchedCandidates"));
const MyJobMatches = lazy(() => import("./pages/MyJobMatches"));
const CVBuilder = lazy(() => import("./pages/CVBuilder"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Reports = lazy(() => import("./pages/Reports"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
const TalentSearch = lazy(() => import("./pages/TalentSearch"));
const ResumeSearch = lazy(() => import("./pages/ResumeSearch"));
const AdminOverview = lazy(() => import("./pages/AdminOverview"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminOrganizations = lazy(() => import("./pages/admin/AdminOrganizations"));
const AdminJobs = lazy(() => import("./pages/admin/AdminJobs"));
const AdminSubscriptions = lazy(() => import("./pages/admin/AdminSubscriptions"));
const AdminInviteCodes = lazy(() => import("./pages/admin/AdminInviteCodes"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminAuditLogs = lazy(() => import("./pages/admin/AdminAuditLogs"));
const AdminRecruiterVerification = lazy(() => import("./pages/admin/AdminRecruiterVerification"));
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications"));
const AdminBilling = lazy(() => import("./pages/admin/AdminBilling"));
const AdminPlatformSettings = lazy(() => import("./pages/admin/AdminPlatformSettings"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCancel = lazy(() => import("./pages/PaymentCancel"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const MessagesPage = lazy(() => import("./pages/MessagesPage"));
const TalentPools = lazy(() => import("./pages/TalentPools"));
const CandidateProfilePage = lazy(() => import("./pages/CandidateProfilePage"));
const PublicJobs = lazy(() => import("./pages/PublicJobs"));
const PublicJobDetails = lazy(() => import("./pages/PublicJobDetails"));
const JobPipeline = lazy(() => import("./pages/JobPipeline"));
const WelcomeShare = lazy(() => import("./pages/WelcomeShare"));
const RecruiterVerification = lazy(() => import("./pages/RecruiterVerification"));
const BannerPreviewDemo = lazy(() => import("./pages/BannerPreviewDemo"));
const CandidateSharePage = lazy(() => import("./pages/CandidateSharePage"));
const ClientReviewPage = lazy(() => import("./pages/ClientReviewPage"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
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
          <Route path="/preview/share" element={<BannerPreviewDemo />} />
          <Route path="/share/candidate/:token" element={<CandidateSharePage />} />
          <Route path="/review/job/:token" element={<ClientReviewPage />} />

          {/* Protected routes - require authentication */}
          {/* Base Protected Routes (Authenticated & Profile exists) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/account/setup" element={<AccountSetup />} />

            {/* Common Routes - Accessible by all roles */}
            <Route element={<RoleProtectedRoute allowedRoles={['candidate', 'employer', 'agency', 'admin', 'expert']} />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/dashboard/settings" element={<Settings />} />
            </Route>

            <Route element={<RoleProtectedRoute allowedRoles={['candidate', 'employer', 'agency']} />}>
              <Route path="/welcome/share" element={<WelcomeShare />} />
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

            <Route element={<RoleProtectedRoute allowedRoles={['employer', 'agency']} />}>
              <Route path="/dashboard/verification" element={<RecruiterVerification />} />
            </Route>

            {/* Employer Only */}
            <Route element={<RoleProtectedRoute allowedRoles={['employer']} />}>
              <Route path="/dashboard/rankings" element={<RankedCandidates />} />
              <Route path="/dashboard/ai-matches" element={<JobMatchedCandidates />} />
            </Route>

            {/* Agency Only */}
            <Route element={<RoleProtectedRoute allowedRoles={['agency']} />}>
              <Route path="/dashboard/submissions" element={<AgencySubmissions />} />
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
              <Route path="/dashboard/admin/invite-codes" element={<AdminInviteCodes />} />
              <Route path="/dashboard/admin/analytics" element={<AdminAnalytics />} />
              <Route path="/dashboard/admin/audit" element={<AdminAuditLogs />} />
              <Route path="/dashboard/admin/recruiter-verification" element={<AdminRecruiterVerification />} />
              <Route path="/dashboard/admin/notifications" element={<AdminNotifications />} />
              <Route path="/dashboard/admin/billing" element={<AdminBilling />} />
              <Route path="/dashboard/admin/settings" element={<AdminPlatformSettings />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <CookieConsent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
