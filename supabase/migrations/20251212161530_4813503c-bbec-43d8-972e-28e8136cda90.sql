-- Create substitution_requests table
CREATE TABLE public.substitution_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  order_item_id UUID NOT NULL REFERENCES order_items(id),
  user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  suggested_item TEXT,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  response_note TEXT,
  response_image_url TEXT,
  responded_by UUID,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.substitution_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own substitution requests
CREATE POLICY "Users can view own substitution requests" ON public.substitution_requests
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM orders WHERE orders.id = substitution_requests.order_id 
      AND (
        orders.consumer_id = auth.uid() OR
        EXISTS (SELECT 1 FROM vendors WHERE vendors.id = orders.vendor_id AND vendors.user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM shoppers WHERE shoppers.id = orders.shopper_id AND shoppers.user_id = auth.uid())
      )
    ) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Users can create substitution requests for their orders
CREATE POLICY "Users can create substitution requests" ON public.substitution_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Vendors and shoppers can update substitution requests for their orders
CREATE POLICY "Order handlers can update substitution requests" ON public.substitution_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM orders WHERE orders.id = substitution_requests.order_id 
      AND (
        EXISTS (SELECT 1 FROM vendors WHERE vendors.id = orders.vendor_id AND vendors.user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM shoppers WHERE shoppers.id = orders.shopper_id AND shoppers.user_id = auth.uid())
      )
    ) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Add notification preferences to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS device_token TEXT;

-- Enable realtime for substitution_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.substitution_requests;

-- Create trigger for updated_at
CREATE TRIGGER update_substitution_requests_updated_at
  BEFORE UPDATE ON public.substitution_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();