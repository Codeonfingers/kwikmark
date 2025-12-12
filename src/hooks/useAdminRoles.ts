import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserRole {
  role: AppRole;
  created_at: string;
}

interface RoleAuditEntry {
  id: string;
  action: "GRANT" | "REVOKE";
  target_user: string;
  role: AppRole;
  admin_user: string;
  reason: string | null;
  ip_address: string | null;
  trace_id: string | null;
  mfa_verified: boolean;
  created_at: string;
}

export const useAdminRoles = () => {
  const [loading, setLoading] = useState(false);

  const grantRole = useCallback(async (
    targetUserId: string, 
    role: AppRole, 
    reason?: string,
    mfaVerified: boolean = false
  ): Promise<{ success: boolean; error?: string; requireMfa?: boolean }> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-roles', {
        body: {
          action: 'grant',
          targetUserId,
          role,
          reason,
          mfaVerified
        }
      });

      if (error) {
        console.error('Grant role error:', error);
        toast.error(error.message || 'Failed to grant role');
        return { success: false, error: error.message };
      }

      if (data.requireMfa) {
        return { success: false, requireMfa: true };
      }

      if (data.error) {
        toast.error(data.error);
        return { success: false, error: data.error };
      }

      toast.success(`Successfully granted ${role} role`);
      return { success: true };
    } catch (err: any) {
      console.error('Grant role exception:', err);
      toast.error('Failed to grant role');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const revokeRole = useCallback(async (
    targetUserId: string, 
    role: AppRole, 
    reason?: string
  ): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-roles', {
        body: {
          action: 'revoke',
          targetUserId,
          role,
          reason
        }
      });

      if (error) {
        console.error('Revoke role error:', error);
        toast.error(error.message || 'Failed to revoke role');
        return { success: false, error: error.message };
      }

      if (data.error) {
        toast.error(data.error);
        return { success: false, error: data.error };
      }

      toast.success(`Successfully revoked ${role} role`);
      return { success: true };
    } catch (err: any) {
      console.error('Revoke role exception:', err);
      toast.error('Failed to revoke role');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const listUserRoles = useCallback(async (
    targetUserId: string
  ): Promise<{ success: boolean; roles?: UserRole[]; error?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-roles', {
        body: {
          action: 'list',
          targetUserId
        }
      });

      if (error) {
        console.error('List roles error:', error);
        return { success: false, error: error.message };
      }

      if (data.error) {
        return { success: false, error: data.error };
      }

      return { success: true, roles: data.roles };
    } catch (err: any) {
      console.error('List roles exception:', err);
      return { success: false, error: err.message };
    }
  }, []);

  const getAuditLog = useCallback(async (
    targetUserId: string
  ): Promise<{ success: boolean; auditLog?: RoleAuditEntry[]; error?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-roles', {
        body: {
          action: 'audit',
          targetUserId
        }
      });

      if (error) {
        console.error('Audit log error:', error);
        return { success: false, error: error.message };
      }

      if (data.error) {
        return { success: false, error: data.error };
      }

      return { success: true, auditLog: data.auditLog };
    } catch (err: any) {
      console.error('Audit log exception:', err);
      return { success: false, error: err.message };
    }
  }, []);

  return {
    loading,
    grantRole,
    revokeRole,
    listUserRoles,
    getAuditLog
  };
};