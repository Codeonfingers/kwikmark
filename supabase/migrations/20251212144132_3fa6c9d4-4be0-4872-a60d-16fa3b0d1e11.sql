-- Enable realtime for orders table
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Add inspection_notes field if not exists
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS inspection_notes text;

-- Add pickup_photo_url field for shopper proof
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pickup_photo_url text;