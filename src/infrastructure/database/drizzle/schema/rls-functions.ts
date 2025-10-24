import { sql } from "drizzle-orm";

/**
 * RLS Helper Functions
 * These functions are used by Row Level Security policies
 *
 * Note: These will be executed as part of the migration generation
 * Use `pnpm db:generate` to create migrations from these functions
 */

// Function to check if current user is admin
export const isAdminFunction = sql`
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Check if current user has admin role
  -- This works with Supabase auth.uid()
  RETURN EXISTS (
    SELECT 1 FROM public.user
    WHERE id = COALESCE(auth.uid()::text, current_setting('request.jwt.claim.sub', true))
    AND role = 'admin'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

COMMENT ON FUNCTION public.is_admin() IS 'Checks if the current user has admin role (SECURITY DEFINER with explicit search_path)';
`;

// Function to get current user ID
export const currentUserIdFunction = sql`
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_id text;
BEGIN
  -- Try to get user ID from JWT (session)
  BEGIN
    user_id := auth.uid()::text;
  EXCEPTION
    WHEN OTHERS THEN
      -- Try alternative method
      user_id := current_setting('request.jwt.claim.sub', true);
  END;

  RETURN user_id;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.current_user_id() IS 'Returns the current user ID from session (SECURITY DEFINER with explicit search_path)';
`;
