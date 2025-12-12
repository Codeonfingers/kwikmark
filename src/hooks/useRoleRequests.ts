import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface RoleRequest {
  id: string;
  user_id: string;
  requested_role: "consumer" | "vendor" | "shopper" | "admin";
  status: "pending" | "approved" | "rejected";
  reason: string | null;
  admin_notes: string | null;
  reviewed_by: string | null;
  submitted_at: string;
  reviewed_at: string | null;
}

export const useRoleRequests = () => {
  const { user, hasRole, refreshRoles } = useAuth();
  const [myRequests, setMyRequests] = useState<RoleRequest[]>([]);
  const [allRequests, setAllRequests] = useState<RoleRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMyRequests = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("role_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("submitted_at", { ascending: false });

    if (!error && data) {
      setMyRequests(data as RoleRequest[]);
    }
  };

  const fetchAllRequests = async () => {
    if (!hasRole("admin")) return;
    const { data, error } = await supabase
      .from("role_requests")
      .select("*")
      .order("submitted_at", { ascending: false });

    if (!error && data) {
      setAllRequests(data as RoleRequest[]);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchMyRequests(), fetchAllRequests()]);
      setLoading(false);
    };
    load();

    // Realtime subscription
    const channel = supabase
      .channel("role-requests-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "role_requests" },
        () => {
          fetchMyRequests();
          fetchAllRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, hasRole]);

  const requestRole = async (role: "vendor" | "shopper", reason?: string) => {
    if (!user) {
      toast.error("Please log in first");
      return { error: new Error("Not authenticated") };
    }

    // Check if already has the role
    if (hasRole(role)) {
      toast.error(`You already have the ${role} role`);
      return { error: new Error("Already has role") };
    }

    // Check for pending request
    const pendingRequest = myRequests.find(
      (r) => r.requested_role === role && r.status === "pending"
    );
    if (pendingRequest) {
      toast.error(`You already have a pending ${role} request`);
      return { error: new Error("Pending request exists") };
    }

    const { data, error } = await supabase
      .from("role_requests")
      .insert({
        user_id: user.id,
        requested_role: role,
        reason: reason || null,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to submit role request");
      return { error };
    }

    toast.success(`${role.charAt(0).toUpperCase() + role.slice(1)} role requested! An admin will review it.`);
    await fetchMyRequests();
    return { data, error: null };
  };

  const approveRequest = async (requestId: string, adminNotes?: string) => {
    if (!hasRole("admin")) {
      toast.error("Only admins can approve requests");
      return { error: new Error("Not authorized") };
    }

    const request = allRequests.find((r) => r.id === requestId);
    if (!request) {
      toast.error("Request not found");
      return { error: new Error("Request not found") };
    }

    // Use the admin_grant_role function
    const { error: grantError } = await supabase.rpc("admin_grant_role", {
      target_user_id: request.user_id,
      target_role: request.requested_role,
      reason: adminNotes || "Approved via role request",
    });

    if (grantError) {
      toast.error("Failed to grant role");
      return { error: grantError };
    }

    // Update the request status
    const { error: updateError } = await supabase
      .from("role_requests")
      .update({
        status: "approved",
        admin_notes: adminNotes || null,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (updateError) {
      toast.error("Failed to update request status");
      return { error: updateError };
    }

    toast.success("Role request approved!");
    await fetchAllRequests();
    return { error: null };
  };

  const rejectRequest = async (requestId: string, adminNotes?: string) => {
    if (!hasRole("admin")) {
      toast.error("Only admins can reject requests");
      return { error: new Error("Not authorized") };
    }

    const { error } = await supabase
      .from("role_requests")
      .update({
        status: "rejected",
        admin_notes: adminNotes || null,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (error) {
      toast.error("Failed to reject request");
      return { error };
    }

    toast.success("Role request rejected");
    await fetchAllRequests();
    return { error: null };
  };

  return {
    myRequests,
    allRequests,
    loading,
    requestRole,
    approveRequest,
    rejectRequest,
    refreshRequests: () => {
      fetchMyRequests();
      fetchAllRequests();
    },
  };
};
