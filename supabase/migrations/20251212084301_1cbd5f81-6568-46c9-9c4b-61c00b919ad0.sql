-- Create trigger on auth.users to automatically create profile and assign default role
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can read their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own roles" ON public.user_roles;

-- Allow users to read their own roles
CREATE POLICY "Users can read their own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow authenticated users to insert their own roles (for adding additional roles)
CREATE POLICY "Users can insert their own roles"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);