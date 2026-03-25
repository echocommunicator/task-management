import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import type { AppRole } from '@/types/user';
import { useAuth } from '@/lib/auth-context';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: AppRole;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;

    // No session/user -> redirect to auth
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }

    // If a required role is specified, check access
    if (requiredRole && profile) {
      // super_admin bypasses all role checks
      const userRole = (profile as unknown as { role?: string }).role;
      const isPlatformAdmin = (profile as unknown as { is_platform_admin?: boolean }).is_platform_admin;

      if (isPlatformAdmin || userRole === 'super_admin') {
        return; // allowed
      }

      if (userRole !== requiredRole) {
        navigate('/', { replace: true });
      }
    }
  }, [user, profile, isLoading, requiredRole, navigate]);

  // Still loading auth state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return null;
  }

  // Role check failed (will redirect via useEffect)
  if (requiredRole && profile) {
    const userRole = (profile as unknown as { role?: string }).role;
    const isPlatformAdmin = (profile as unknown as { is_platform_admin?: boolean }).is_platform_admin;

    if (!isPlatformAdmin && userRole !== 'super_admin' && userRole !== requiredRole) {
      return null;
    }
  }

  return <>{children}</>;
}
