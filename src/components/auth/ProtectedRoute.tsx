import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type AppRole = "consumer" | "vendor" | "shopper" | "admin";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: AppRole;
  redirectTo?: string;
}

const ProtectedRoute = ({ 
  children, 
  requiredRole, 
  redirectTo = "/auth" 
}: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const { user, loading, rolesLoading, roles, hasRole } = useAuth();

  useEffect(() => {
    if (loading || rolesLoading) return;

    // Not authenticated
    if (!user) {
      navigate(redirectTo, { replace: true });
      return;
    }

    // Role check if required - wait for roles to be loaded
    if (requiredRole && roles.length > 0 && !hasRole(requiredRole)) {
      // Redirect to appropriate dashboard based on their actual role
      if (hasRole("admin")) {
        navigate("/admin", { replace: true });
      } else if (hasRole("vendor")) {
        navigate("/vendor", { replace: true });
      } else if (hasRole("shopper")) {
        navigate("/shopper", { replace: true });
      } else {
        navigate("/customer", { replace: true });
      }
    }
  }, [user, loading, rolesLoading, roles, requiredRole, hasRole, navigate, redirectTo]);

  if (loading || rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check authentication
  if (!user) {
    return null;
  }

  // Check role if required - allow access if roles haven't loaded yet (will redirect in useEffect)
  if (requiredRole && roles.length > 0 && !hasRole(requiredRole)) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
