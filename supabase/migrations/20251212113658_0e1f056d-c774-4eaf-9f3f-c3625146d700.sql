-- Create role_audit_log table for comprehensive role change tracking
CREATE TABLE IF NOT EXISTS public.role_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL CHECK(action IN ('GRANT','REVOKE')),
  target_user uuid NOT NULL,
  role app_role NOT NULL,
  admin_user uuid NOT NULL,
  reason TEXT,
  ip_address TEXT,
  trace_id TEXT,
  mfa_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on role_audit_log
ALTER TABLE public.role_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view role audit logs" ON public.role_audit_log
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Drop existing permissive policies that allow direct writes
DROP POLICY IF EXISTS "Users can add vendor or shopper roles" ON public.user_roles;

-- Create strict policy: users can ONLY self-assign vendor or shopper roles
CREATE POLICY "Users can self-assign vendor or shopper only" ON public.user_roles
  FOR INSERT WITH CHECK (
    auth.uid() = user_id 
    AND role IN ('vendor'::app_role, 'shopper'::app_role)
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = user_roles.role
    )
  );

-- Drop and recreate admin_grant_role with proper signature and audit logging
DROP FUNCTION IF EXISTS public.admin_grant_role(uuid, app_role);
DROP FUNCTION IF EXISTS public.admin_grant_role(uuid, app_role, text, text, text, boolean);

-- Create comprehensive grant function
CREATE OR REPLACE FUNCTION public.admin_grant_role(
  target_user_id uuid,
  target_role app_role,
  reason text DEFAULT NULL,
  ip_addr text DEFAULT NULL,
  trace text DEFAULT NULL,
  mfa_verified boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_admin boolean;
  result jsonb;
BEGIN
  -- Check if the caller is an admin
  SELECT public.has_role(auth.uid(), 'admin'::app_role) INTO caller_is_admin;
  
  IF NOT caller_is_admin THEN
    RAISE EXCEPTION 'Only admins can grant roles';
  END IF;
  
  -- For ADMIN role, require MFA verification
  IF target_role = 'admin'::app_role AND NOT mfa_verified THEN
    RAISE EXCEPTION 'MFA verification required for admin role grants';
  END IF;
  
  -- For ADMIN role, require reason
  IF target_role = 'admin'::app_role AND (reason IS NULL OR reason = '') THEN
    RAISE EXCEPTION 'Reason required for admin role grants';
  END IF;
  
  -- Insert the role (idempotent)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, target_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Log the action in role_audit_log
  INSERT INTO public.role_audit_log (action, target_user, role, admin_user, reason, ip_address, trace_id, mfa_verified)
  VALUES ('GRANT', target_user_id, target_role, auth.uid(), reason, ip_addr, trace, mfa_verified);
  
  -- Also log in general audit_logs for redundancy
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, details)
  VALUES (auth.uid(), 'GRANT_ROLE', 'user_roles', target_user_id, 
    jsonb_build_object('role', target_role::text, 'reason', reason, 'mfa_verified', mfa_verified));
  
  result := jsonb_build_object('success', true, 'role', target_role::text);
  RETURN result;
END;
$$;

-- Create revoke function
CREATE OR REPLACE FUNCTION public.admin_revoke_role(
  target_user_id uuid,
  target_role app_role,
  reason text DEFAULT NULL,
  ip_addr text DEFAULT NULL,
  trace text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_admin boolean;
  admin_count integer;
  result jsonb;
BEGIN
  -- Check if the caller is an admin
  SELECT public.has_role(auth.uid(), 'admin'::app_role) INTO caller_is_admin;
  
  IF NOT caller_is_admin THEN
    RAISE EXCEPTION 'Only admins can revoke roles';
  END IF;
  
  -- Prevent removing the last admin
  IF target_role = 'admin'::app_role THEN
    SELECT COUNT(*) INTO admin_count 
    FROM public.user_roles 
    WHERE role = 'admin'::app_role;
    
    IF admin_count <= 1 THEN
      RAISE EXCEPTION 'Cannot remove the last admin';
    END IF;
  END IF;
  
  -- Remove the role
  DELETE FROM public.user_roles 
  WHERE user_id = target_user_id AND role = target_role;
  
  -- Log the action in role_audit_log
  INSERT INTO public.role_audit_log (action, target_user, role, admin_user, reason, ip_address, trace_id, mfa_verified)
  VALUES ('REVOKE', target_user_id, target_role, auth.uid(), reason, ip_addr, trace, false);
  
  -- Also log in general audit_logs
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, details)
  VALUES (auth.uid(), 'REVOKE_ROLE', 'user_roles', target_user_id, 
    jsonb_build_object('role', target_role::text, 'reason', reason));
  
  result := jsonb_build_object('success', true, 'role', target_role::text);
  RETURN result;
END;
$$;

-- Create function to get user roles with profile info for admin
CREATE OR REPLACE FUNCTION public.admin_get_user_roles(target_user_id uuid)
RETURNS TABLE (
  role app_role,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role, created_at
  FROM public.user_roles
  WHERE user_id = target_user_id;
$$;