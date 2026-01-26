import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/hooks/useProfile';

/**
 * ProtectedRoute - Prevents unauthenticated access and ensures valid profile
 * 
 * Behavior:
 * - Shows loading while auth/profile is loading
 * - Redirects to /login if no user
 * - Redirects to /account/setup if no profile or invalid role
 * - Renders child routes if authenticated with valid profile
 */
const ProtectedRoute = () => {
    const { user, loading } = useAuth();
    const { profile, isLoading: profileLoading } = useProfile();
    const location = useLocation();

    // Wait for auth and profile to initialize
    if (loading || profileLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Redirect unauthenticated users to login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Redirect users without valid profile/role to account setup
    // Skip this check if already on account setup page
    if (location.pathname !== '/account/setup') {
        if (!profile || !profile.role || !['candidate', 'employer', 'agency', 'admin'].includes(profile.role)) {
            return <Navigate to="/account/setup" replace />;
        }
    }

    // Render protected content
    return <Outlet />;
};

export default ProtectedRoute;
