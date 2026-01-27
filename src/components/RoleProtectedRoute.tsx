import { Navigate, Outlet } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';

interface RoleProtectedRouteProps {
    allowedRoles: ('candidate' | 'employer' | 'agency' | 'admin')[];
}

const RoleProtectedRoute = ({ allowedRoles }: RoleProtectedRouteProps) => {
    const { profile, isLoading } = useProfile();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!profile || !profile.role) {
        return <Navigate to="/login" replace />;
    }

    if (!allowedRoles.includes(profile.role as any)) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 gradient-section">
                <Card className="max-w-md w-full shadow-2xl border-destructive/20">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                            <ShieldAlert className="w-8 h-8 text-destructive" />
                        </div>
                        <CardTitle className="text-xl font-bold text-foreground">Access Denied</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-6">
                        <p className="text-muted-foreground">
                            You do not have permission to view this page. This area is restricted to <span className="font-medium text-foreground">{allowedRoles.join(' or ')}</span> accounts.
                        </p>
                        <div className="flex flex-col gap-2">
                            <Link to="/dashboard">
                                <Button className="w-full" variant="default">
                                    Return to Dashboard
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return <Outlet />;
};

export default RoleProtectedRoute;
