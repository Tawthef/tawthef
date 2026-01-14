import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

/**
 * ProtectedRoute - Prevents unauthenticated access to wrapped routes
 * 
 * Behavior:
 * - Shows nothing while auth is loading (prevents redirect flicker)
 * - Redirects to /login if no user
 * - Renders child routes if authenticated
 */
const ProtectedRoute = () => {
    const { user, loading } = useAuth();

    // Wait for auth to initialize (prevents redirect flicker on refresh)
    if (loading) {
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

    // Render protected content
    return <Outlet />;
};

export default ProtectedRoute;
