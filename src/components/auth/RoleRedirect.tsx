import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Component that redirects authenticated users to their appropriate dashboard
 * based on their roles. Priority: admin > vendor > shopper > consumer
 */
const RoleRedirect = () => {
  const navigate = useNavigate();
  const { user, loading, rolesLoading, roles, hasRole } = useAuth();

  useEffect(() => {
    if (loading || rolesLoading) {
      console.log("[RoleRedirect] Still loading...", { loading, rolesLoading });
      return;
    }

    if (!user) {
      console.log("[RoleRedirect] No user, redirecting to auth");
      navigate("/auth", { replace: true });
      return;
    }

    console.log("[RoleRedirect] User roles:", roles);

    // Redirect based on role priority
    if (hasRole("admin")) {
      console.log("[RoleRedirect] User has admin role, redirecting to /admin");
      navigate("/admin", { replace: true });
    } else if (hasRole("vendor")) {
      console.log("[RoleRedirect] User has vendor role, redirecting to /vendor");
      navigate("/vendor", { replace: true });
    } else if (hasRole("shopper")) {
      console.log("[RoleRedirect] User has shopper role, redirecting to /shopper");
      navigate("/shopper", { replace: true });
    } else if (hasRole("consumer")) {
      console.log("[RoleRedirect] User has consumer role, redirecting to /customer");
      navigate("/customer", { replace: true });
    } else {
      // No roles found - might be a timing issue, default to customer
      console.log("[RoleRedirect] No roles found, defaulting to /customer");
      navigate("/customer", { replace: true });
    }
  }, [user, loading, rolesLoading, roles, hasRole, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Loading your dashboard...</p>
      </div>
    </div>
  );
};

export default RoleRedirect;
