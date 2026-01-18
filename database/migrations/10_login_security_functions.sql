-- =====================================================
-- LOGIN SECURITY FUNCTIONS
-- iGAS Helpdesk - Additional functions for login security
-- =====================================================
-- Execute this AFTER 09_password_policies.sql

-- =====================================================
-- 1. FUNCTION: Record Failed Login Attempt
-- =====================================================
-- Allows anonymous users to record failed attempts (SECURITY DEFINER)

CREATE OR REPLACE FUNCTION record_failed_login_attempt(
  attempt_email TEXT,
  attempt_error_code TEXT DEFAULT NULL,
  attempt_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO failed_login_attempts (
    email,
    ip_address,
    user_agent,
    error_code,
    error_message,
    attempted_at
  ) VALUES (
    attempt_email,
    NULL, -- IP address would need to be passed from edge function
    NULL, -- User agent would need to be passed from edge function
    attempt_error_code,
    attempt_error_message,
    NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. FUNCTION: Get Remaining Login Attempts
-- =====================================================
-- Returns how many attempts remain before account is blocked

CREATE OR REPLACE FUNCTION get_remaining_login_attempts(user_email TEXT)
RETURNS INTEGER AS $$
DECLARE
  failed_count INTEGER;
  max_attempts CONSTANT INTEGER := 5;
BEGIN
  -- Count failed attempts in the last 15 minutes
  SELECT COUNT(*)
  INTO failed_count
  FROM failed_login_attempts
  WHERE email = user_email
  AND attempted_at > NOW() - INTERVAL '15 minutes';

  -- Return remaining attempts (minimum 0)
  RETURN GREATEST(max_attempts - failed_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. GRANTS FOR ANONYMOUS ACCESS
-- =====================================================
-- These functions need to work BEFORE user is authenticated

-- Allow anonymous users to check if blocked
GRANT EXECUTE ON FUNCTION is_user_blocked(TEXT) TO anon;

-- Allow anonymous users to record failed attempts
GRANT EXECUTE ON FUNCTION record_failed_login_attempt(TEXT, TEXT, TEXT) TO anon;

-- Allow anonymous users to get remaining attempts
GRANT EXECUTE ON FUNCTION get_remaining_login_attempts(TEXT) TO anon;

-- Also ensure authenticated users have access
GRANT EXECUTE ON FUNCTION record_failed_login_attempt(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_remaining_login_attempts(TEXT) TO authenticated;

-- =====================================================
-- 4. UPDATE RLS POLICY FOR ANONYMOUS INSERT
-- =====================================================
-- Allow anonymous inserts to failed_login_attempts (via function only)

-- Drop old restrictive policy if exists
DROP POLICY IF EXISTS "Only admins can insert failed attempts" ON failed_login_attempts;

-- The insert is done via SECURITY DEFINER function, so no direct policy needed
-- The function runs with definer's privileges, bypassing RLS

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Test is_user_blocked function
SELECT is_user_blocked('test@example.com') as is_blocked;

-- Test get_remaining_login_attempts function
SELECT get_remaining_login_attempts('test@example.com') as remaining_attempts;

-- Verify functions exist and have correct permissions
SELECT
  p.proname as function_name,
  pg_catalog.pg_get_function_identity_arguments(p.oid) as arguments,
  CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND p.proname IN (
  'is_user_blocked',
  'record_failed_login_attempt',
  'get_remaining_login_attempts'
);

-- =====================================================
-- NOTES
-- =====================================================
/*
IMPORTANT: These functions use SECURITY DEFINER which means they run
with the permissions of the function owner (usually postgres/superuser).

This is necessary because:
1. Users need to check if they're blocked BEFORE authenticating
2. Failed attempts need to be recorded even when login fails
3. The anon role wouldn't normally have access to these tables

Security considerations:
- Functions only allow specific operations (no SELECT of sensitive data)
- record_failed_login_attempt only INSERTs, cannot read/modify existing data
- is_user_blocked and get_remaining_login_attempts only return boolean/integer
*/
