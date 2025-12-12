-- =============================================
-- 1. Create trigger function to auto-create shopper_job when order is created
-- =============================================
CREATE OR REPLACE FUNCTION public.create_shopper_job_on_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.shopper_jobs (order_id, commission_amount, status)
  VALUES (NEW.id, COALESCE(NEW.shopper_fee, 5.00), 'available')
  ON CONFLICT (order_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Attach trigger to orders table
DROP TRIGGER IF EXISTS on_order_created_create_job ON public.orders;
CREATE TRIGGER on_order_created_create_job
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_shopper_job_on_order();

-- =============================================
-- 2. Backfill missing shopper_jobs for existing orders
-- =============================================
INSERT INTO public.shopper_jobs (order_id, commission_amount, status)
SELECT id, COALESCE(shopper_fee, 5.00), 'available' 
FROM public.orders 
WHERE id NOT IN (SELECT order_id FROM public.shopper_jobs)
ON CONFLICT (order_id) DO NOTHING;

-- =============================================
-- 3. Create disputes table
-- =============================================
CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL,
  reported_user_id UUID,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'closed')),
  category TEXT NOT NULL CHECK (category IN ('quality', 'missing_items', 'payment', 'delivery', 'other')),
  description TEXT NOT NULL,
  resolution TEXT,
  admin_notes TEXT,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- Users can view their own disputes
CREATE POLICY "Users can view own disputes" ON public.disputes
  FOR SELECT USING (reporter_id = auth.uid() OR reported_user_id = auth.uid());

-- Users can create disputes
CREATE POLICY "Users can create disputes" ON public.disputes
  FOR INSERT WITH CHECK (reporter_id = auth.uid());

-- Admins can manage all disputes
CREATE POLICY "Admins can manage disputes" ON public.disputes
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at trigger
CREATE TRIGGER update_disputes_updated_at
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- 4. Enable realtime for shopper_jobs and disputes
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.shopper_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.disputes;