-- KwikMarket Seed Data Script
-- Run this in your Supabase SQL editor to populate sample data

-- Clear existing data (be careful in production!)
-- DELETE FROM order_items;
-- DELETE FROM orders;
-- DELETE FROM products;
-- DELETE FROM vendors;
-- DELETE FROM shoppers;
-- DELETE FROM markets;
-- DELETE FROM categories;

-- Insert Markets
INSERT INTO markets (id, name, location, description, is_active) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Makola Market', 'Accra Central', 'The largest open market in Accra, known for textiles, food, and household items', true),
  ('550e8400-e29b-41d4-a716-446655440002', 'Kaneshie Market', 'Kaneshie, Accra', 'Popular market for fresh produce and daily essentials', true),
  ('550e8400-e29b-41d4-a716-446655440003', 'Kejetia Market', 'Kumasi', 'The largest single market in West Africa with everything under one roof', true)
ON CONFLICT (id) DO NOTHING;

-- Insert Categories
INSERT INTO categories (id, name, icon) VALUES
  ('660e8400-e29b-41d4-a716-446655440001', 'Vegetables', '🥬'),
  ('660e8400-e29b-41d4-a716-446655440002', 'Proteins', '🍖'),
  ('660e8400-e29b-41d4-a716-446655440003', 'Fruits', '🍎'),
  ('660e8400-e29b-41d4-a716-446655440004', 'Staples', '🍚'),
  ('660e8400-e29b-41d4-a716-446655440005', 'Spices', '🌶️'),
  ('660e8400-e29b-41d4-a716-446655440006', 'Seafood', '🐟')
ON CONFLICT (id) DO NOTHING;

-- Note: Vendors need to be created by actual users via signup
-- Below is a template for manually inserting test vendors if you have user IDs

-- Insert sample vendors (replace USER_ID with actual user IDs from auth.users)
-- INSERT INTO vendors (id, user_id, business_name, stall_number, market_id, description, is_verified, is_active) VALUES
--   ('770e8400-e29b-41d4-a716-446655440001', 'USER_ID_1', 'Mama Ama Fresh Produce', 'A-15', '550e8400-e29b-41d4-a716-446655440001', 'Fresh vegetables and fruits daily from local farms', true, true),
--   ('770e8400-e29b-41d4-a716-446655440002', 'USER_ID_2', 'Kofi Meat Corner', 'B-22', '550e8400-e29b-41d4-a716-446655440001', 'Quality meats and smoked fish', true, true),
--   ('770e8400-e29b-41d4-a716-446655440003', 'USER_ID_3', 'Auntie Grace Provisions', 'C-08', '550e8400-e29b-41d4-a716-446655440002', 'Rice, beans, gari and all staples', true, true)
-- ON CONFLICT (id) DO NOTHING;

-- Template products (requires valid vendor_id)
-- INSERT INTO products (vendor_id, name, description, price, unit, category_id, is_available, stock_quantity) VALUES
--   ('VENDOR_ID', 'Fresh Tomatoes', 'Locally grown ripe tomatoes', 5.00, 'kg', '660e8400-e29b-41d4-a716-446655440001', true, 100),
--   ('VENDOR_ID', 'Garden Eggs', 'Fresh garden eggs', 3.50, 'bowl', '660e8400-e29b-41d4-a716-446655440001', true, 50),
--   ('VENDOR_ID', 'Pepper Mix', 'Blended scotch bonnet and tomatoes', 8.00, 'bowl', '660e8400-e29b-41d4-a716-446655440005', true, 30),
--   ('VENDOR_ID', 'Kontomire', 'Fresh cocoyam leaves', 4.00, 'bunch', '660e8400-e29b-41d4-a716-446655440001', true, 40),
--   ('VENDOR_ID', 'Smoked Fish', 'Premium smoked tilapia', 25.00, 'piece', '660e8400-e29b-41d4-a716-446655440006', true, 20),
--   ('VENDOR_ID', 'Fresh Tilapia', 'Live tilapia fish', 35.00, 'kg', '660e8400-e29b-41d4-a716-446655440006', true, 15),
--   ('VENDOR_ID', 'Eggs', 'Fresh eggs', 18.00, 'crate', '660e8400-e29b-41d4-a716-446655440002', true, 25),
--   ('VENDOR_ID', 'Local Rice', 'Premium local rice', 80.00, 'bag', '660e8400-e29b-41d4-a716-446655440004', true, 50),
--   ('VENDOR_ID', 'Gari', 'Quality cassava flakes', 30.00, 'bowl', '660e8400-e29b-41d4-a716-446655440004', true, 100),
--   ('VENDOR_ID', 'Beans', 'Black-eyed peas', 25.00, 'bowl', '660e8400-e29b-41d4-a716-446655440004', true, 60),
--   ('VENDOR_ID', 'Plantain', 'Ripe plantain', 8.00, 'bunch', '660e8400-e29b-41d4-a716-446655440003', true, 40),
--   ('VENDOR_ID', 'Bananas', 'Sweet bananas', 5.00, 'bunch', '660e8400-e29b-41d4-a716-446655440003', true, 50);

-- Grant admin role to a specific user (replace with actual user ID)
-- INSERT INTO user_roles (user_id, role)
-- VALUES ('ADMIN_USER_ID', 'admin')
-- ON CONFLICT (user_id, role) DO NOTHING;

SELECT 'Seed data inserted successfully. Markets and categories are ready.' as status;
SELECT 'Note: Vendors and products require valid user IDs. Create users via signup first.' as note;