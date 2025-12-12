-- Fix: Drop the overly permissive INSERT policy that allows users to insert any role
-- Keep only the restrictive policy that limits to vendor/shopper roles
DROP POLICY IF EXISTS "Users can insert their own roles" ON public.user_roles;