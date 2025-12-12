-- Drop the SECURITY DEFINER view and recreate as regular view
-- The masking functions are already SECURITY DEFINER so they handle the security
DROP VIEW IF EXISTS public.admin_profiles_view;

-- Recreate view without SECURITY DEFINER (uses invoker's permissions)
CREATE VIEW public.admin_profiles_view
WITH (security_invoker = true)
AS
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

-- Grant select on the view
GRANT SELECT ON public.admin_profiles_view TO authenticated;