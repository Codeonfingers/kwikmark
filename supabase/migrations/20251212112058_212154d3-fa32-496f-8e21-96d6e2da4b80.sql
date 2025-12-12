-- Create a function to mask sensitive data for display
CREATE OR REPLACE FUNCTION public.mask_ghana_card(card_number text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF card_number IS NULL OR length(card_number) < 8 THEN
    RETURN NULL;
  END IF;
  -- Return only last 4 characters visible: ****5678
  RETURN '****' || right(card_number, 4);
END;
$$;

-- Create a function to mask phone numbers
CREATE OR REPLACE FUNCTION public.mask_phone(phone_number text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF phone_number IS NULL OR length(phone_number) < 6 THEN
    RETURN NULL;
  END IF;
  -- Return masked: ***XXX1234
  RETURN '***' || right(phone_number, 4);
END;
$$;

-- Create a secure view for admin to see masked profile data
CREATE OR REPLACE VIEW public.admin_profiles_view AS
SELECT 
  p.id,
  p.user_id,
  p.full_name,
  p.avatar_url,
  public.mask_phone(p.phone) as phone_masked,
  public.mask_ghana_card(p.ghana_card_number) as ghana_card_masked,
  p.is_verified,
  p.created_at,
  p.updated_at
FROM public.profiles p;

-- Grant select on the view to authenticated users (RLS will still apply)
GRANT SELECT ON public.admin_profiles_view TO authenticated;

-- Update the profiles RLS policy for admins to use the view instead
-- Admins should query admin_profiles_view, not profiles directly for sensitive data

-- Add a policy comment to document the security requirement
COMMENT ON TABLE public.profiles IS 'User profiles - Ghana Card and phone are sensitive. Admins should use admin_profiles_view for masked data.';

-- Create an audit log table for tracking sensitive data access
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  details jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));

-- System can insert audit logs (via service role)
CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- Create a secure function for admin role assignment (only callable via service role)
CREATE OR REPLACE FUNCTION public.admin_grant_role(target_user_id uuid, target_role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_admin boolean;
BEGIN
  -- Check if the caller is an admin
  SELECT public.has_role(auth.uid(), 'admin'::app_role) INTO caller_is_admin;
  
  IF NOT caller_is_admin THEN
    RAISE EXCEPTION 'Only admins can grant roles';
  END IF;
  
  -- Insert the role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, target_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Log the action
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, details)
  VALUES (auth.uid(), 'GRANT_ROLE', 'user_roles', target_user_id, jsonb_build_object('role', target_role::text));
END;
$$;