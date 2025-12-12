-- Update handle_new_user to read role from user metadata instead of hardcoding consumer
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  selected_role app_role;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, full_name, phone)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'phone'
  );
  
  -- Get the selected role from metadata, default to 'consumer' only if not specified
  selected_role := COALESCE(
    (NEW.raw_user_meta_data ->> 'selected_role')::app_role,
    'consumer'::app_role
  );
  
  -- Insert the user's selected role (NOT always consumer)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, selected_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$function$;