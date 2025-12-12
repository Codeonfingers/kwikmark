-- Create role_requests table for users to request additional roles
CREATE TABLE IF NOT EXISTS public.role_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  requested_role public.app_role NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reason text,
  admin_notes text,
  reviewed_by uuid,
  submitted_at timestamp with time zone DEFAULT now(),
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.role_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own role requests
CREATE POLICY "Users can view own role requests"
  ON public.role_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create role requests for themselves
CREATE POLICY "Users can create role requests"
  ON public.role_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND requested_role IN ('vendor'::app_role, 'shopper'::app_role));

-- Admins can view all role requests
CREATE POLICY "Admins can view all role requests"
  ON public.role_requests
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can update role requests
CREATE POLICY "Admins can update role requests"
  ON public.role_requests
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Add inspection fields to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS inspection_status text DEFAULT 'pending' CHECK (inspection_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS inspected_at timestamp with time zone;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS all_items_confirmed boolean DEFAULT false;

-- Add proof fields to shopper_jobs
ALTER TABLE public.shopper_jobs ADD COLUMN IF NOT EXISTS proof_url text;
ALTER TABLE public.shopper_jobs ADD COLUMN IF NOT EXISTS proof_uploaded_at timestamp with time zone;

-- Enable realtime for role_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.role_requests;