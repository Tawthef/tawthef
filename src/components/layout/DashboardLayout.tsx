import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Briefcase, Users, FileText, Settings, LogOut, ChevronDown, Bell, Search, Building2, User, ClipboardList, BarChart3, UserCheck, Menu, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/context/AuthContext";
import logo from "@/assets/tawthef-logo.png";

interface DashboardLayoutProps {
  children: ReactNode;
  role?: "candidate" | "agency" | "employer" | "expert" | "admin";
  userName?: string;
  companyName?: string;
}

const DashboardLayout = ({ children, role: propRole, userName: propUserName, companyName = "Acme Corp" }: DashboardLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { profile, isLoading } = useProfile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Use real profile data with fallbacks to props
  const userName = profile?.full_name || propUserName || user?.email?.split('@')[0] || "User";
  const role = profile?.role || propRole;

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Lock body scroll when sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const getNavItems = () => {
    switch (role) {
      case "candidate": return [{ name: "Dashboard", href: "/dashboard", icon: LayoutDashboard }, { name: "Browse Jobs", href: "/dashboard/jobs", icon: Briefcase }, { name: "My Applications", href: "/dashboard/applications", icon: FileText }, { name: "My Profile", href: "/dashboard/profile", icon: User }, { name: "Settings", href: "/dashboard/settings", icon: Settings }];
      case "agency": return [{ name: "Dashboard", href: "/dashboard", icon: LayoutDashboard }, { name: "Job Requests", href: "/dashboard/jobs", icon: Briefcase }, { name: "Candidates", href: "/dashboard/candidates", icon: Users }, { name: "Recruiters", href: "/dashboard/team", icon: UserCheck }, { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 }, { name: "Settings", href: "/dashboard/settings", icon: Settings }];
      case "employer": return [{ name: "Dashboard", href: "/dashboard", icon: LayoutDashboard }, { name: "Jobs", href: "/dashboard/jobs", icon: Briefcase }, { name: "Candidates", href: "/dashboard/candidates", icon: Users }, { name: "Pipeline", href: "/dashboard/pipeline", icon: ClipboardList }, { name: "Agencies", href: "/dashboard/agencies", icon: Building2 }, { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 }, { name: "Settings", href: "/dashboard/settings", icon: Settings }];
      case "expert": return [{ name: "Dashboard", href: "/dashboard", icon: LayoutDashboard }, { name: "Review Queue", href: "/dashboard/reviews", icon: ClipboardList }, { name: "Completed", href: "/dashboard/completed", icon: UserCheck }, { name: "Settings", href: "/dashboard/settings", icon: Settings }];
      case "admin": return [{ name: "Dashboard", href: "/dashboard", icon: LayoutDashboard }, { name: "Tenants", href: "/dashboard/tenants", icon: Building2 }, { name: "Users", href: "/dashboard/users", icon: Users }, { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 }, { name: "Activity Logs", href: "/dashboard/logs", icon: FileText }, { name: "Settings", href: "/dashboard/settings", icon: Settings }];
      default: return [];
    }
  };

  const navItems = getNavItems();
  const getRoleLabel = () => ({ candidate: "Candidate", agency: "Agency", employer: "Employer", expert: "Technical Reviewer", admin: "Platform Admin" }[role] || "");

  // Loading skeleton for user info
  const userInitials = isLoading ? "..." : userName.split(" ").map(n => n[0]).join("").toUpperCase();

  const SidebarContent = () => (
    <>
      <div className="h-20 lg:h-24 flex items-center justify-between px-6 lg:px-8 border-b border-sidebar-border/30">
        <Link to="/"><img src={logo} alt="Tawthef" className="h-8 lg:h-10 w-auto brightness-0 invert opacity-90" /></Link>
        <Button variant="ghost" size="icon" className="lg:hidden text-sidebar-foreground" onClick={() => setSidebarOpen(false)}>
          <X className="w-5 h-5" />
        </Button>
      </div>
      <nav className="flex-1 px-4 lg:px-5 py-6 lg:py-10 space-y-1.5 lg:space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link key={item.name} to={item.href} className={cn("flex items-center gap-3 lg:gap-4 px-4 lg:px-5 py-3 lg:py-4 rounded-xl text-sm font-medium transition-all duration-300", isActive ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/30" : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40")}>
              <item.icon className="w-5 h-5" />{item.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 lg:p-6 border-t border-sidebar-border/30">
        <div className="flex items-center gap-3 lg:gap-4 px-2 lg:px-3">
          <div className="w-10 lg:w-12 h-10 lg:h-12 rounded-xl bg-gradient-to-br from-sidebar-primary to-sidebar-primary/70 flex items-center justify-center shadow-lg shadow-sidebar-primary/30">
            <span className="text-xs lg:text-sm font-semibold text-sidebar-primary-foreground">{userInitials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{isLoading ? "Loading..." : userName}</p>
            <p className="text-xs text-sidebar-foreground/40 truncate font-light">{getRoleLabel()}</p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen gradient-section flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Desktop fixed, Mobile drawer */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 lg:w-72 flex flex-col bg-sidebar border-r border-sidebar-border/50 transform transition-transform duration-300 ease-in-out",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 lg:h-24 bg-card/80 backdrop-blur-premium border-b border-border/30 flex items-center justify-between px-4 sm:px-6 lg:px-12 sticky top-0 z-30">
          {/* Mobile menu button */}
          <Button variant="ghost" size="icon" className="lg:hidden mr-2" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>

          {/* Search - hidden on mobile */}
          <div className="hidden sm:block flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-4 lg:left-5 top-1/2 -translate-y-1/2 w-4 lg:w-5 h-4 lg:h-5 text-muted-foreground" />
              <input type="text" placeholder="Search..." className="w-full h-10 lg:h-14 pl-11 lg:pl-14 pr-4 lg:pr-5 rounded-xl border border-border/40 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all" />
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2 sm:gap-4 ml-auto sm:ml-8">
            <Button variant="ghost" size="icon" className="relative w-10 h-10 lg:w-12 lg:h-12 rounded-xl">
              <Bell className="w-4 lg:w-5 h-4 lg:h-5" /><span className="absolute top-2 right-2 lg:top-2.5 lg:right-2.5 w-2 h-2 lg:w-2.5 lg:h-2.5 bg-accent rounded-full border-2 border-card" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 lg:gap-3 h-10 lg:h-12 px-2 lg:px-4 rounded-xl">
                  <div className="w-8 lg:w-10 h-8 lg:h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm">
                    <span className="text-xs font-semibold text-primary-foreground">{userInitials}</span>
                  </div>
                  <span className="hidden sm:block text-sm font-medium">{isLoading ? "Loading..." : userName}</span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 p-2">
                <div className="px-3 py-3"><p className="text-sm font-medium">{userName}</p><p className="text-xs text-muted-foreground font-light">{getRoleLabel()}</p></div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/dashboard/profile")} className="rounded-lg py-3"><User className="w-4 h-4 mr-3" />Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/dashboard/settings")} className="rounded-lg py-3"><Settings className="w-4 h-4 mr-3" />Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive rounded-lg py-3"><LogOut className="w-4 h-4 mr-3" />Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-12 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
